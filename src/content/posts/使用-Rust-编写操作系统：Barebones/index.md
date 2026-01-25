---
title: 使用 Rust 编写操作系统：Barebones
date: 2025-07-03 01:30:20
tags:
    - 笔记
    - 技术
    - 操作系统
categories:
    - 操作系统
    - Philipp Oppermann
---

这是 Philipp Oppermann
的操作系统系列博客的第一大章节，主讲如何搭建起一个基本的操作系统框架。

<!-- more -->

## [独立的 Rust 二进制文件](https://os.phil-opp.com/freestanding-rust-binary/)

> Rust 在 Rust 1.88.0 引入了一个叫作 `bare-function` 的特性用于强化 `no_std`
> 的开发体验，因此我们基于这个新特性来改进原文中的一些过时之处

### `panic_impl duplicate`

在写完这部分的代码后你会发现一个很奇怪的问题：Rust Analyzer 总是提示你你的
`panic_impl` 实现重复了，因为 `test` 依赖于 `std` 并且它已经在 `std` 中实现了

> found duplicate lang item panic_impl
>
> the lang item is first defined in crate std (which test depends on)

这个 ERROR
实际上不影响编译，只是会显得很碍眼，可以使用一个简单的方式把他关掉：不使用
`test` 就好了

```rust
#![cfg(not(test))]
```

#### Link args

在这一章节提到了编译时需要链接参数，我们可以在 `.cargo/config.toml` 里写上传递给
`rustc` 的参数

```toml
[target.'cfg(target_os="windows")']
rustflags = [
    "-C",
    "link-args=/ENTRY:_start",
    "-C",
    "link-args=/SUBSYSTEM:console",
]

[target.'cfg(target_os="linux")']
rustflags = ["-C", "link-arg=-nostartfiles"]
```

> [!NOTE]
> 注意，由于该系列的文章是面向 x64 的，所以无法通过基于 Apple Silicon 的 macOS 的编译，因此暂时关闭了 macOS 的编译也暂时不支持他。
