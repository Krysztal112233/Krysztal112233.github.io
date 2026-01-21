---
title: 基于栈的虚拟机与基于寄存器的虚拟机
date: 2025-07-20 13:19:49
tags:
    - 笔记
    - 学习
    - 技术
---

经常听到 LuaJIT 和 JVM 分别是基于寄存器的虚拟机和基于栈的虚拟机，那么这两种虚拟机究竟有什么区别？

<!-- more -->

## 最主要的区别

既然都叫作虚拟机了，那么实际上这些 Runtime 的最终目的是模仿实体机提供一个可以跨平台运行的环境。

### 基于寄存器的操作

读过计组和 CSAPP 的朋友们都知道，我们的 x86 机器指令存在一个东西叫作 N 地址指令，他看起来像是这样

- N=3: `ADD a, b, c`
- N=2: `ADD a, b`

`ADD` 指令后的地址就是目标的地址，并且 `ADD` 命令在完成后会在某个寄存器/内存里放入这次运算的值。经典的 x86 采用的是二地址指令，会在某个寄存器里放入这个值

### 基于栈的操作

那么如果我们的 N 地址 `N=0` 会发生什么？看起来我们没有任何地址可以存放读取。

但如果我们引入一个数据结构来储存值，操作数仅仅能操作当前最新的值会发生什么？基于栈的虚拟机就产生了。

#### 求值栈

我们引入一个栈式结构叫作**求值栈**，并且假定有如下的命令

```bash
iconst_1  
iconst_2  
iadd  
istore_0
```

在 `iconst_1` 和 `iconst_2` 中我们压入了两个整型值：`1`，`2`

然后我们使用了 `iadd` 命令，`iadd` 命令将会弹出栈顶的两个整型值，并且将其相加后压入栈顶，这样我们的求值栈就只有一个值 `2` 了

在完成以上求值后，我们使用了 `istore` 命令将求值栈最终的值放到局部变量区的 `0` 号位

- `istore`, `istore_<n>`: An _istore_ instruction with operand `Index` is type safe and yields an outgoing type state `NextStackFrame`, if a store instruction with operand `Index` and type `int` is type safe and yields an outgoing type state `NextStackFrame`.
- `iadd`: An _iadd_ instruction is type safe iff one can validly replace types matching `int` and `int` on the incoming operand stack with `int` yielding the outgoing type state.

这样看起来就非常的跨平台，因为到目前为止几乎完全不用和平台的寄存器交互，这几乎完全是模拟出来的行为

如果要用 x86 汇编的话，两条指令就可以了：

```asm
mov  eax, 1  
add  eax, 2
```

请注意，求值栈（Evaluate Stack）不是一个固定的名字，除了求值栈，还可以叫作表达式栈（Expression Stack）

## 各有优劣？

简单列个表会更直观一些

请注意，设计模式并不是固定的，例如 JVM 的 JIT 也会面向平台进行特化，这一步实际上也是走向基于寄存器的虚拟机的设计模式，因为这样很明显会更快

|              | 基于栈的虚拟机 | 基于寄存器的虚拟机 | 理由                                                                                                                     |
| ------------ | :------------: | :----------------: | ------------------------------------------------------------------------------------------------------------------------ |
| 可移植性     |       高       |         低         | 基于寄存器的虚拟机由于需要考虑和本地机器的映射关系，因此需要花很大力气去整理映射关系，但基于栈的虚拟机不需要这层映射关系 |
| 实现难易度   |      简单      |         难         | 同上                                                                                                                     |
| 性能         |      较慢      |        快速        | 基于寄存器的虚拟机由于存在和本地机器的寄存器映射关系，因此运行起来非常的高效，基于栈的虚拟机有额外开销                   |
| 储存资源占用 |      较低      |        较高        | 由于基于栈的虚拟机使用的是零地址指令，它的占用比其他任何指令都小并且更加紧凑。所以基于栈的虚拟机对于硬盘占用会更小       |

## 参照

- [虚拟机随谈（一）：解释器，树遍历解释器，基于栈与基于寄存器，大杂烩](https://www.iteye.com/blog/rednaxelafx-492667)
- [Java Virtual Machine Specification: 4.10.1.9. Type Checking Instructions ](https://docs.oracle.com/javase/specs/jvms/se24/html/jvms-4.html#jvms-4.10.1.9)
