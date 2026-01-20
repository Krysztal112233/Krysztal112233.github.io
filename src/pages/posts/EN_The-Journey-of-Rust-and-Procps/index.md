---
title: "EN:The Journey of Rust and Procps"
date: 2024-08-20 20:43:12
tags:
  - 笔记
  - 文章
---

Hi, I'm Krysztal Huang, a contributor to Debian's `uutils/procps`.

<!-- more -->

I'm thrilled to have had the opportunity to participate in GSoC 2024, contributing to the uutils project and gaining a wealth of knowledge and skills along the way. :)

The Debian and uutils communities are incredibly welcoming, which has been fantastic. I've been using Debian as my primary operating system for about eight years now, drawn to its stability. I frequently rely on Debian for my personal services and various projects.

## The procps project

The most widely used implementation of `procps` is the one under **GPLv3**, the [procps-ng](https://gitlab.com/procps-ng/procps) project. It provides a set of tools for system information statistics that have been used for many years and have served well. However, it is written in **C** and licensed under **GPLv3**.

This project has been in use for over thirty years, and its code is not as **_open_** as it could be because of its license. Moreover, it will likely remain in our operating systems for the foreseeable future.

But `procps` and C are **getting old**. Younger developers tend to prefer newer programming languages like Rust. As a result, `procps` may rely on the previous generation for maintenance, while the younger generation may have less interest in it due to their unfamiliarity with C. Consequently, those **wanting to contribute** may struggle to effectively fix issues.

## The CVEs and Rust

Rust offers excellent memory safety and performance. Many CVEs associated with the original `procps` are related to memory safety issues (e.g., buffer overflows):

- [CVE-2018-1126](https://security-tracker.debian.org/tracker/CVE-2018-1126)
- [CVE-2018-1125](https://security-tracker.debian.org/tracker/CVE-2018-1125)

...and others.

However, with Rust, these issues are caught at compile time, thanks to its ownership system.

## So...?

I'm working on rewriting `procps` under the [uutils](https://github.com/uutils) organization. The new implementation, simply called [procps](https://github.com/uutils/procps), has taught me a lot: from understanding the `/proc` pseudo-filesystem to the differences between \*NIX (and \*NIX-like) systems.

The initial implementation of uutils `procps` was focused on the Linux platform. However, to support the broader \*NIX platform, including macOS and FreeBSD, it's important to address the subtle differences in implementation across these operating systems. As of now, the uutils `procps` **does not support** macOS and FreeBSD.

Relevant issues:

- [procps#162](https://github.com/uutils/procps/issues/162)
- [procps#179](https://github.com/uutils/procps/issues/179)

The ultimate goal for uutils `procps` is to support both \*NIX and Windows platforms. However, the threading models for Windows and \*NIX platforms differ significantly, necessitating the abstraction of these models into a more general one.

Most importantly, uutils' `procps` implementation is licensed using the MIT license, which is a very loose open source license. Meaning that uutils' procps has virtually no restrictions from source distribution to use.

## What did I do?

I've implemented the basic parts of some commands and they now run the most basic functions.

Relevant prs:

- [pgrep](https://github.com/uutils/procps/pull/95)
- [pidof](https://github.com/uutils/procps/pull/112)
- [pidwait](https://github.com/uutils/procps/pull/167)
- [ps](https://github.com/uutils/procps/pull/133)
- [slabtop](https://github.com/uutils/procps/pull/42)
- [top](https://github.com/uutils/procps/pull/189)

---

Thanks to my mentors and, without your help, I probably wouldn't have fit into the community and development as well as I have :)
