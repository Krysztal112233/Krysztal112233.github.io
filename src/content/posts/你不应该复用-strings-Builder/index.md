---
title: 你不应该复用 strings.Builder
date: 2026-01-01 18:54:46
tags:
  - 笔记
  - 文章
---

在编写 Go 程序的时候在程序所占用的堆足够大后经常会遇到 GC 缓慢的问题，在这个时候第一个入手的地方就是利用对象池来处理对象复用问题减轻 GC 压力。

特别是对于 `strings.Builder` 类型，更应该利用 `sync.Pool` 来复用它对...吧？

<!-- more -->

## 网上是怎么说的？

截止 2025 年 11 月 22 日，在 Bing 上搜索关键字`strings.Builder 复用`会得到如下几个排在前面的结果

- [高并发 Go 服务如何避免 GC 压力？strings.Builder 复用技术详解](https://datasea.cn/go1030234009.html)
- [Golang  中  strings.builder  的 7 个要点 - 知乎](https://zhuanlan.zhihu.com/p/147042526)
- [Golang 字符串优化：strings.Builder 使用技巧-Golang 学习网](https://www.17golang.com/article/281350.html)

毫不意外地，三篇看起来高质量中文来源的文档都提到了你应该复用 `strings.Builder`。事实是这样吗？

## 为什么你不应该复用 `strings.Builder`?

要继续了解这一点，我们需要知道一个基础知识： `string` 类型是不可变的，一旦创建不可修改（正常情况下）

如果要进行修改需要使用 unsafe 黑魔法，而大多数情况下应该保持其不可变原则

### `strings.Builder` 的源码

简略起见，这里摘抄本文涉及到的代码即可

```go
// A Builder is used to efficiently build a string using [Builder.Write] methods.
// It minimizes memory copying. The zero value is ready to use.
// Do not copy a non-zero Builder.
type Builder struct {
	addr *Builder // of receiver, to detect copies by value

	// External users should never get direct access to this buffer, since
	// the slice at some point will be converted to a string using unsafe, also
	// data between len(buf) and cap(buf) might be uninitialized.
	buf []byte
}

// String returns the accumulated string.
func (b *Builder) String() string [](){
	return unsafe.String(unsafe.SliceData(b.buf), len(b.buf))
}

// Reset resets the [Builder] to be empty.
func (b *Builder) Reset() {
	b.addr = nil
	b.buf = nil
}

// copyCheck implements a dynamic check to prevent modification after
// copying a non-zero Builder, which would be unsafe (see #25907, #47276).
//
// We cannot add a noCopy field to Builder, to cause vet's copylocks
// check to report copying, because copylocks cannot reliably
// discriminate the zero and nonzero cases.
func (b *Builder) copyCheck() {
	if b.addr == nil {
		// This hack works around a failing of Go's escape analysis
		// that was causing b to escape and be heap allocated.
		// See issue 23382.
		// TODO: once issue 7921 is fixed, this should be reverted to
		// just "b.addr = b".
		b.addr = (*Builder)(abi.NoEscape(unsafe.Pointer(b)))
	} else if b.addr != b {
		panic("strings: illegal use of non-zero Builder copied by value")
	}
}
```

### 特殊的地方？

我摘抄了三个函数，他们分别是

- `func (b *Builder) Reset()`：重置状态函数
- `func (b *Builder) String() string`：转换成 string 类型的最终函数
- `func (b *Builder) copyCheck()`：掌管 `Builder` 不能被复制的神

从这三个函数中就能看到端倪：`copyCheck` 的存在实际上不允许 `Builder` 被复制，当出现复制的时候会直接 **panic**

> copyCheck implements a dynamic check to prevent modification after copying a non-zero Builder, which would be unsafe (see #25907, #47276).
>
> We cannot add a noCopy field to Builder, to cause vet's copylocks check to report copying, because copylocks cannot reliably discriminate the zero and nonzero cases.
>
> copyCheck 实现了一种运行时检查，用于防止在复制了一个非零的 Builder 之后再对其进行修改，因为那样做是不安全的（见 issue 25907, 47276）。
>
> 我们不能给 Builder 增加一个 noCopy 字段，从而让 go vet 的 copylocks 检查器报告复制行为，因为 copylocks 无法可靠地区分“零值”和“非零值”这两种情况。

这几段代码中提到了几个 issues，也顺便记录在这里

- [strings: copying but not using a Builder after first use leads to runtime crash (generates heap -> stack pointer) #47276](https://github.com/golang/go/issues/47276)
- [proposal: embed "noCopy" for bytes.Buffer and strings.Builder #25907](https://github.com/golang/go/issues/25907)
- [strings: Builder copy check causes a dynamic memory allocation #23382](https://github.com/golang/go/issues/23382)

看起来这里还涉及到了逃逸分析的事情，我们日后再探 :)

### 黑魔法？

可以很简单的注意到代码切片中有一些 unsafe 用法:

```go
func (b *Builder) String() string [](){
	return unsafe.String(unsafe.SliceData(b.buf), len(b.buf))
}
```

> 这个写法其实是后来 Go 官方引入的 unsafe 工具，在此之前写法比较像是：
>
> ```go
> *(*string)(unsafe.Pointer(&b))
> ```
>
> 其中 `b` 的类型是 `[]byte`。
>
> `unsafe.String` 于 https://github.com/golang/go/issues/53003 引入

这个 unsafe 用法非常典型，可以避免一次因为从切片类型转换到 string 类型导致的开销。

但事实上黑魔法总是有代价的，不然为什么叫作黑魔法？

### 因黑魔法付出的代价

还记得吗？在 Go 中默认情况下 `string` 类型是不可变的：创建后就不可以修改，如果要修改那么需要付出一次复制内存的代价。

这句话的另外一个意思是：正常创建的 `string` 对象是不会被修改的。

我们使用以上提到的 unsafe 黑魔法时本质上是对指针进行强制转换，可以这样做的前提是对象的内存布局相同

> 这里引出了一个问题：如果因为某种情况导致内存布局不同，那么黑魔法就会反噬我们。
>
> 在上文提到的 issues https://github.com/golang/go/issues/53003 中也有相关提及：
>
> > The second use case is commonly seen as _(_[]byte)(unsafe.Pointer(&string)), which is by-default broken because the Cap field can be past the end of a page boundary (example here, in widely used code) -- this violates unsafe rule (1).

在 Go 中，切片类型是可变的，而 string 类型是不可变的——那我们就得到了一个结论， `strings.Builder` 在完成构造 `string` 的时候最终需要构造出一个不可变的类型的指针 `string` 指向这块内存。

在 `strings.Builder` 这个**语境**上，我们有两个选择：

- 不复制内部的 `[]byte`，在使用 `String()` 方法的时候强制转换指向其的指针类型成为 `string` 作为返回值。
- 复制内部的 `[]byte`，并且重置内部的 `[]byte` 指针为 `nil`，将指向原先 `[]byte` 的指针强制转换为 `string` 作为返回值。

而 Go 选择了第一个方法。为什么呢？

考虑到开销和常见的用法，确实第一种会更合理——因为拼出来的 string 可能会非常大，如果在最后一步还要付出一次复制开销显然是不值得的。

我们继续深入考虑这个选择：当你把指向一块内存的指针从可变类型转换成为了不可变类型，如果你不做额外措施保护这一块内存的话那么他就会受到修改，进而使得产生数据竞争破坏内存。

所以复用 `strings.Builder` 起码不能减轻因为内存分配而产生的 GC 压力——因为分配的内存块并不能被成功复用。

我们这个时候来看看 `Reset()` 这个方法，可以清楚的看见这个方法的功能是置为 `nil` 而不是清空状态，调用 `Reset()` 后会完全清空其中的内容，这样也就避免了内存块在转换成为 `string` 受到破坏的可能。

**_换句话来讲，`Reset()` 这个方法其实相当于把 `strings.Builder` 恢复到刚实例化的时候。_**

### 所以使用 `sync.Pool` 复用 `strings.Builder` 有提升吗？

基于这个想法，我们可以构造多个情况来检测是否有提升。

| 名字                            | 场景描述                      | 实现方式          |
| :------------------------------ | ----------------------------- | ----------------- |
| `BenchmarkWithoutReset`         | 大写入量，串行                | 每次都新建        |
| `BenchmarkWithReset`            | 大写入量，串行                | Pool + Reset 复用 |
| `BenchmarkWithoutResetTiny`     | 极小写入量，串行              | 每次都新建        |
| `BenchmarkWithResetTiny`        | 极小写入量，串行              | Pool + Reset 复用 |
| `BenchmarkWithoutResetParallel` | 极小写入量，32 并发 goroutine | 每次都新建        |
| `BenchmarkWithResetParallel`    | 极小写入量，32 并发 goroutine | Pool + Reset 复用 |

我编写的代码如下

```go
package bench_test

import (
	"strings"
	"sync"
	"testing"
)

// 全局的 Pool，避免每次 benchmark 都重新创建
var builderPool = sync.Pool{
	New: func() any {
		return new(strings.Builder)
	},
}

// 为了公平，我们让两个 benchmark 都做同样多的写入工作
const writeSize = 64 // 每次写 64 字节

// 每次新建 Builder
func BenchmarkWithoutReset(b *testing.B) {
	b.ReportAllocs()
	for b.Loop() {
		var buf strings.Builder
		for range 100 {
			buf.WriteString("0123456789ABCDEF")
			buf.WriteString("0123456789ABCDEF")
			buf.WriteString("0123456789ABCDEF")
			buf.WriteString("0123456789ABCDEF")
		}
		_ = buf.String()
	}
}

// 复用 Builder 并 Reset
func BenchmarkWithReset(b *testing.B) {
	b.ReportAllocs()
	for b.Loop() {
		buf := builderPool.Get().(*strings.Builder)
		buf.Reset() // 清零
		for range 100 {
			buf.WriteString("0123456789ABCDEF")
			buf.WriteString("0123456789ABCDEF")
			buf.WriteString("0123456789ABCDEF")
			buf.WriteString("0123456789ABCDEF")
		}
		_ = buf.String()
		builderPool.Put(buf) // 归还
	}
}

// 测试非常小分配的情况下不调用 Reset 的情况
func BenchmarkWithoutResetTiny(b *testing.B) {
	const tiny = "x" // 1 字节
	b.ReportAllocs()
	for b.Loop() {
		var buf strings.Builder
		for range 100 {
			buf.WriteString(tiny)
		}
		_ = buf.String()
	}
}

// 测试非常小分配的情况下调用 Reset 的情况
func BenchmarkWithResetTiny(b *testing.B) {
	const tiny = "x"
	b.ReportAllocs()
	for b.Loop() {
		buf := builderPool.Get().(*strings.Builder)
		buf.Reset()
		for range 100 {
			buf.WriteString(tiny)
		}
		_ = buf.String()
		builderPool.Put(buf)
	}
}

// 测试非常小分配的情况下不调用 Reset 的情况（并行）
func BenchmarkWithoutResetParallel(b *testing.B) {
	const tiny = "x"
	b.ReportAllocs()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			var buf strings.Builder
			for range 100 {
				buf.WriteString(tiny)
			}
			_ = buf.String()
		}
	})
}

// 测试非常小分配的情况下调用 Reset 的情况（并行）
func BenchmarkWithResetParallel(b *testing.B) {
	const tiny = "x"
	b.ReportAllocs()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			buf := builderPool.Get().(*strings.Builder)
			buf.Reset()
			for range 100 {
				buf.WriteString(tiny)
			}
			_ = buf.String()
			builderPool.Put(buf)
		}
	})
}
```

运行这个测试，在我的电脑上得出了如下结果：

```bash
➜  bench go version
go version go1.24.9 linux/amd64
➜  bench go test -bench=. -benchmem

goos: linux
goarch: amd64
pkg: bench
cpu: AMD Ryzen 9 7945HX with Radeon Graphics
BenchmarkWithoutReset-32                  357000              3283 ns/op           24816 B/op         13 allocs/op
BenchmarkWithReset-32                     406946              3279 ns/op           24854 B/op         13 allocs/op
BenchmarkWithoutResetTiny-32             2897300               404.1 ns/op           248 B/op          5 allocs/op
BenchmarkWithResetTiny-32                3016304               400.0 ns/op           248 B/op          5 allocs/op
BenchmarkWithoutResetParallel-32        17941327                75.50 ns/op          248 B/op          5 allocs/op
BenchmarkWithResetParallel-32           13661240                90.87 ns/op          248 B/op          5 allocs/op
PASS
ok      bench   7.642s
```

## 最终的结论

另外我需要提到的是，在部分情况下 `string` 到 `[]byte` 是可以不付出转换开销的，可以看这个 [issue](https://github.com/golang/go/issues/2205)
