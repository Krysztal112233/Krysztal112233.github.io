---
title: 使用 Rust 编写操作系统：引言
date: 2025-07-01 14:30:20
tags:
  - 笔记
  - 技术
  - 操作系统
categories:
  - 操作系统
  - Philipp Oppermann
---

最近在互联网上冲浪的时候找到了这个博客（其实是朋友发的），感觉很有意思于是决定做一下。

<!-- more -->

> Philipp Oppermann is a freelance Rust developer from Germany. He is working on
> the Dora robotic framework and on various projects related to operating system
> development in Rust. Philipp is the author of the "Writing an OS in Rust" blog
> and the main editor of the "This Month in Rust OSDev" newsletter.

嗯，看起来挺权威的 XD

### 梗概

这一系列博客文章算是能覆盖最基础最基础的操作系统概念，根据他的归类可以做如下大纲：

- Barebones: 基础
  - 独立的 Rust 二进制文件
  - 最小化的 Rust 内核
  - VGA 字符模式
  - 内核测试
- 中断
  - CPU 异常处理
  - Double Faults
  - 硬件中断
- 内存管理
  - 内存分页初探
  - 分页实现
  - 堆分配
  - 内存分配器设计
- 多任务
  - Async/Await

可以看到这个系列的博客探讨的是一个操作系统的最最基础的几个要素，其他在此之上构建的一些模块并没有包含：

- 文件系统
- IPC
- 程序链接与执行

它更像是一个跑在单片机上的应用程序。但，我们真实世界的操作系统从脱离单片机进入现代设计也不过三四十年，因此还是有不少可以参考的设计

### 打算做的一些改进

Philipp Oppermann 在编写博客的时候是 2018 年，那个时候最新也就 Rust 2018
Edition，而现在已经是 2024 年了，所以我打算基于最新的 Rust 2024 Edition 做些改进

_TO BE CONTINUED_
