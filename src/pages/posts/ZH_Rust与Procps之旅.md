---
title: "ZH:Rust 与 Procps 之旅"
date: 2024-08-20 20:43:12
tags:
  - 笔记
  - 文章
---

大家好，我是 Krysztal Huang，Debian 的 `uutils/procps` 贡献者之一。

<!-- more -->

很高兴能参与 GSoC 2024，为 uutils 项目做出贡献，并在此过程中学到了许多有趣的知识和技能。:)

Debian 和 uutils 社区非常友好，这是非常棒的。我使用 Debian 作为我的主要操作系统已有大约八年的时间，主要是被它的稳定性所吸引。我经常依赖 Debian 来支持我的个人服务和各种项目。

## procps 项目

最广泛使用的 `procps` 实现是 **GPLv3** 许可下的 [procps-ng](https://gitlab.com/procps-ng/procps) 项目。它提供了一组用于系统信息统计的工具，多年来一直被广泛使用，并且表现良好。然而，它是用 **C** 语言编写的，并采用 **GPLv3** 许可。

该项目已经使用了三十多年，但因为许可证的原因，其**_自由性_**不足。此外，它可能还会在我们的操作系统中继续存在很长时间。

但 `procps` 和 C 语言已经**逐渐老化**。年轻的开发者更倾向于使用像 Rust 这样的新编程语言。因此，`procps` 可能会依赖上一代开发者来维护，而年轻一代由于对 C 语言不熟悉，可能对其兴趣不大。因此，**想要参与开发**的年轻人可能无法有效地修复问题。

## CVE 与 Rust

Rust 提供了出色的内存安全性和性能。原始 `procps` 的许多 CVE 都与内存安全问题有关（例如，缓冲区溢出）：

- [CVE-2018-1126](https://security-tracker.debian.org/tracker/CVE-2018-1126)
- [CVE-2018-1125](https://security-tracker.debian.org/tracker/CVE-2018-1125)

……等等。

然而，在 Rust 中，得益于它的所有权系统，这些问题在编译时就能被捕获。

## 所以……？

我正在[**uutils**](https://github.com/uutils)组织下重写 `procps`。新的实现被简单地命名为 [**procps**](https://github.com/uutils/procps)，在这个过程中我学到了很多：从理解 `/proc` 伪文件系统到了解 \*NIX（及 \*NIX 类）系统之间的差异。

uutils `procps` 的初始实现主要集中在 Linux 平台。然而，为了支持更广泛的 \*NIX 平台，包括 macOS 和 FreeBSD，我们必须处理这些操作系统在实现上的细微差异。截至目前，uutils `procps` **不支持** macOS 和 FreeBSD。

相关问题：

- [procps#162](https://github.com/uutils/procps/issues/162)
- [procps#179](https://github.com/uutils/procps/issues/179)

uutils `procps`的最终目标是同时支持 \*NIX 和 Windows 平台。然而，Windows 和 \*NIX 平台的线程模型差异显著，因此有必要将这些线程模型抽象为一个更通用的模型。

最重要的是，uutils 的 `procps` 实现使用 MIT 协议进行授权，这是一款十分宽松的开源协议。意味着 uutils 的 `procps` 几乎没有任何限制，从源码分发到使用。

## 我做了什么？

我实现了一些命令的基本部分，它们现在可以运行最基本的功能。

相关 PR：

- [pgrep](https://github.com/uutils/procps/pull/95)
- [pidof](https://github.com/uutils/procps/pull/112)
- [pidwait](https://github.com/uutils/procps/pull/167)
- [ps](https://github.com/uutils/procps/pull/133)
- [slabtop](https://github.com/uutils/procps/pull/42)
- [top](https://github.com/uutils/procps/pull/189)

---

感谢我的导师们，没有你们的帮助，我可能无法如此顺利地融入社区和开发中。:)
