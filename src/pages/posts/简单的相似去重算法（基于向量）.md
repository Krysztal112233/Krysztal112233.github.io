---
title: 简单的相似去重算法（基于向量）
date: 2025-05-12 21:47:43
tags:
  - 算法
  - 数据库
---

在工作的时候遇到一个对图片进行去重的需求，简单记录一下

<!-- more -->

# 算法

当前提供两种算法，两种算法都依赖于向量数据库。并且由于架构设计，现在两种算法在执行时几乎只需要向量数据库

## 层级递进

这种算法可以在每次产生新数据时对新数据进行处理，如果新数据里已经出现过之前就已经被查找到的相似图片那么该数据就会被剔除

```go
func (d *Deduplicator) _algorithmV0(trainedUuid string, fuzz float32) {
    if d.searchedUuids.Contains(trainedUuid) {
        return
    }

    if res, err := d.vdb.SearchByNearOjWithDistance(trainedUuid, fuzz); err != nil {
        logrus.Errorf("while try to fetching result of `%s`: %s", trainedUuid, err)
    } else if len(res) > 1 {
        currentResult := x.NewList[ProcessedID]()
        for _, file := range res {
            partial, exist := d.fileIdMapping[file.FileId]
            if exist && !d.searchedUuids.Contains(partial.UUID) {
                currentResult.Append(ProcessedID{ID: file.FileId, Distance: file.Additional.Distance, Time: partial.TakeTime})
            }
            d.searchedUuids.Add(partial.UUID)
        }

        if currentResult.Len() > 1 {
            tmp := d.postproc(currentResult)
            d.result.Append(tmp)
        }
    }
}
```

### 后处理

在完成结果获取后我们还需要一次过滤操作，我们令该操作为 filter

filter 函数接受一个 **float64**
类型的参数，根据这个参数过滤掉不需要的值只保留需要的值

## 全量关联合并

这种算法实现起来就非常简单，相当于把上一种算法的去重步骤给放到提取结果的时候。

但这个算法会对每组都进行查找，假设有三十万个向量数据则会查找三十万次

```go
func (d *Deduplicator) _algorithmV1(trainedUuid string, fuzz float32) {
    if res, err := d.vdb.SearchByNearOjWithDistance(trainedUuid, fuzz); err != nil {
        logrus.Errorf("while try to fetching result of `%s`: %s", trainedUuid, err)
    } else {
        currentResult := x.NewList[ProcessedID]()
        for _, file := range res {
            partial, exist := d.fileIdMapping[file.FileId]
            if exist {
                currentResult.Append(ProcessedID{ID: file.FileId, Distance: file.Additional.Distance, Time: partial.TakeTime})
            }
            d.searchedUuids.Add(partial.UUID)
        }

        if currentResult.Len() > 1 {
            d.result.Append(d.postproc(currentResult))
        }
    }
}
```

### 合并

我们令以上算法得到的结果为 res ，并且新引入一个函数 merging

令我们最终得到的结果为
y，相比于[层级递进](#层级递进)算法我们可以更加动态的计算结果

```go
func merging(input [][]ProcessedID) [][]ProcessedID {
    walked := mapset.NewSet[uint]()

    result := make([][]ProcessedID, 0)
    for _, group := range input {
        tmp := slices.DeleteFunc(group, func(id ProcessedID) bool { return walked.Contains(id.ID) })
        result = append(result, tmp)

        for _, t := range tmp {
            walked.Add(t.ID)
        }

    }
    return result
}
```

这样做，和[层级递进](#层级递进)最大的区别就在于全量运算，并且在获取结果的时候进行关联合并

### 后处理

全量关联合并的后处理和[层级递进](#层级递进)的后处理步骤一致

# 算法缺陷

## 层级递进算法的问题

旧算法的复杂度为 $O(n)$ 到 $O(n^2)$, 计算量比较小速度快但是缺点也非常明显

- 计算结果只能在向量空间里一次性使用，假如在二维向量空间里则圆缩小后无法从缩小前和缩小后之间的区域重新规划出集合，也就是存在并查集问题
- 因为上述原因，去重的结果只在单次有效

## 全量关联合并算法的问题

该算法的主要问题在于计算缓慢，对于正常用户环境的三十万条向量数据在懒猫微服上计算需要十分钟

但我们可以选择将其作为后台运行的任务并且将其计算结果作为缓存来处理，这样就能扬长避短了
