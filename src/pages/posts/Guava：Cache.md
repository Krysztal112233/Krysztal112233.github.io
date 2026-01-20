---
title: Guava：Cache
date: 2023-10-18 19:18:39
tags:
  - 笔记
  - 学习
  - 技术
---

在开车的时候，与前方车辆一定要保持适当的距离，不管车速如何都是如此。这段距离叫做缓冲距离；在开发中也有类似的概念，不过分为 `Buffer` 和 `Cache`，`Cache` 偏向无序，`Buffer` 偏向有序。

<!-- more -->

## 为什么要用 `Cache`？用 HashMap 不是更好？

听着，我知道你很喜欢用 HashMap 也很喜欢自己造轮子。但是你要知道，你自己造的轮子大概率功能比不过 Guava 这种久经风霜的库，即使 Guava 非常的重并且非常的庞大。

为什么用 `Guava` 的 Cache？单纯就是方便。Guava 的 `Cache` 提供了以下非常吸引人的方面特性。

- 从命令行式参数构建
- 过期时行为
- 多种驱逐方式

即使 Guava 的 `Cache` 实现非常的简单，我们也没有必要去和 Guava 这种经历了长期考验的库看谁做的好。节约时间很重要。

## 构建你的 `Cache` 视图

对于是否可以安全的在多个线程之间共享一个 `Cache`，答案是可以：`Cache` 最核心的实现其实是 `ConcurrentHashMap`，因此是线程安全的。

### 选择驱逐模式 (Eviction)

Guava 的 `Cache` 提供了三种驱逐模式，适用于不同的场合。当然到底该用什么驱逐模式应该由开发者自己决定。

- 基于时间的驱逐模式 [Timed Eviction](https://github.com/google/guava/wiki/CachesExplained#timed-eviction)
- 基于大小的驱逐模式 [Size-based Eviction](https://github.com/google/guava/wiki/CachesExplained#size-based-eviction)
- 基于引用的驱逐模式 [Reference-based Eviction](https://github.com/google/guava/wiki/CachesExplained#reference-based-eviction)

请查阅给出的链接选择适合你的模式。对于一般项目来讲，最合适的是基于时间的驱逐模式以及基于大小的驱逐模式，基于引用的驱逐模式很少用，这种需要借助 GC 进行缓存驱逐的驱逐策略难判断什么时候会缓存穿透。

### 缓存权重

TODO

### 驱逐时的监听器

假设一个情景，你的缓存是一种面向反复查询数据库的缓存，你的缓存能暂时保存数据，并且在过期时写入缓存内的数据到数据库里。

这个时候，你就需要设计驱逐时的监听器了——驱逐时把缓存里的东西写到数据库里。

## 其他建议

考虑到缓存有可能是需要异步的，但是 Guava 没有提供这种操作。所以 Guava 建议使用 [Caffeine](https://github.com/ben-manes/caffeine) 这个项目。

不用担心，Guava `Cache` 和 `Caffeine` 项目的使用方法几乎一模一样。
