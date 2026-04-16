---
title: Linux 内核中的度量单位
date: 2026-04-16 11:59:52
tags:
    - 笔记
    - Linux
---

又是狠狠地被 Linux 中度量单位坑害的一天。

<!-- more -->

## 关于内核里的度量单位

在这里的度量单位主要是指诸如 `/proc/meminfo` 中的出现的单位：`kB` 等。

典型的 `/proc/meminfo` 输出值如下所示

```bash
❯ cat /proc/meminfo
MemTotal:       48503556 kB
MemFree:        29195360 kB
MemAvailable:   41944808 kB
Buffers:            6960 kB
Cached:         12880504 kB
SwapCached:            0 kB
Active:         10123228 kB
Inactive:        5656716 kB
Active(anon):    3008104 kB
Inactive(anon):        0 kB
Active(file):    7115124 kB
Inactive(file):  5656716 kB
Unevictable:         264 kB
Mlocked:             264 kB
SwapTotal:      67110908 kB
SwapFree:       67110908 kB
Zswap:                 0 kB
Zswapped:              0 kB
Dirty:                32 kB
Writeback:             0 kB
AnonPages:       2728952 kB
Mapped:          1793336 kB
Shmem:            115936 kB
KReclaimable:     569648 kB
Slab:             935144 kB
SReclaimable:     569648 kB
SUnreclaim:       365496 kB
KernelStack:       25792 kB
PageTables:        44688 kB
SecPageTables:      4924 kB
NFS_Unstable:          0 kB
Bounce:                0 kB
WritebackTmp:          0 kB
CommitLimit:    91362684 kB
Committed_AS:   16030888 kB
VmallocTotal:   34359738367 kB
VmallocUsed:      194032 kB
VmallocChunk:          0 kB
Percpu:            34688 kB
HardwareCorrupted:     0 kB
AnonHugePages:    827392 kB
ShmemHugePages:        0 kB
ShmemPmdMapped:        0 kB
FileHugePages:   1107968 kB
FilePmdMapped:    643072 kB
CmaTotal:              0 kB
CmaFree:               0 kB
Unaccepted:            0 kB
Balloon:               0 kB
HugePages_Total:       0
HugePages_Free:        0
HugePages_Rsvd:        0
HugePages_Surp:        0
Hugepagesize:       2048 kB
Hugetlb:               0 kB
DirectMap4k:     2532648 kB
DirectMap2M:    20756480 kB
DirectMap1G:    26214400 kB
```

如你所见，其中的值均为 `kB` 单位，而根据 SI 和 IEC 的推荐与定义，`kB` 表达的实际意义是 $10^3$

## SI 与 IEC 的定义

### 十进制前缀（SI）

| 名字   | 符号 | 倍数      |
| ------ | ---- | --------- |
| 千字节 | kB   | $10^3$    |
| 兆字节 | MB   | $10^6$    |
| 吉字节 | GB   | $10^9$    |
| 太字节 | TB   | $10^{12}$ |
| 拍字节 | PB   | $10^{15}$ |
| 艾字节 | EB   | $10^{18}$ |
| 泽字节 | ZB   | $10^{21}$ |
| 尧字节 | YB   | $10^{24}$ |
| 容字节 | RB   | $10^{27}$ |
| 昆字节 | QB   | $10^{30}$ |

### 二进制前缀（IEC 60027-2）

| 名字      | 符号 | 倍数      |
| --------- | ---- | --------- |
| kibibyte  | KiB  | $2^{10}$  |
| mebibyte  | MiB  | $2^{20}$  |
| gibibyte  | GiB  | $2^{30}$  |
| tebibyte  | TiB  | $2^{40}$  |
| pebibyte  | PiB  | $2^{50}$  |
| exbibyte  | EiB  | $2^{60}$  |
| zebibyte  | ZiB  | $2^{70}$  |
| yobibyte  | YiB  | $2^{80}$  |
| robibyte  | RiB  | $2^{90}$  |
| quebibyte | QiB  | $2^{100}$ |

## 事实？

事实上因为一些历史原因，Linux 内核的 `kB` 实际上意义是 `KiB`。

### 深入内核

由于翻阅的是 `/proc/meminfo`，因此可以很方便的找到内核中生成这个文件的源码。

我在内核中找到了[如下代码](https://github.com/torvalds/linux/blob/v7.0/fs/proc/meminfo.c)，用于生成 `kB` 数据

```c
static void show_val_kb(struct seq_file *m, const char *s, unsigned long num)
{
        seq_put_decimal_ull_width(m, s, num << (PAGE_SHIFT - 10), 8);
        seq_write(m, " kB\n", 4);
}
```

> [!NOTE]
> 基于 Linux 7.0。在接下来的篇章中若无特别说明均基于 Linux 7.0。

注意到计算方式是使用左移，众所周知在二进制中进行左移 `n` 位实际上等于 $2^n$，**因此在这里的 `kB` 实际意义是 `KiB`**。

### 历史渊源

在闲逛的时候发现 Wikipedia 有个[专门的页面来展示 kilo 的演变](https://en.wikipedia.org/wiki/Timeline_of_binary_prefixes)，其中专门提到了 [Linux 内核使用 IEC 词头][https://en.wikipedia.org/wiki/Timeline_of_binary_prefixes#2001]。

并且给了两个参考链接：

- ["UNITS"](https://web.archive.org/web/20070902124532/http://www.annodex.net/cgi-bin/man/man2html?units+7). [Linux Programmer's Manual.](<https://en.wikipedia.org/wiki/Manual_page_(Unix)>) December 22, 2001. Archived from the original on September 2, 2007. Retrieved May 20, 2007. "When the Linux kernel boots and says hda: 120064896 sectors (61473 MB) w/2048KiB Cache the MB are megabytes and the KiB are kibibytes."
- ["Configure.help editorial policy".](https://lwn.net/2002/0103/a/esr-kibi.php3) Lwn.net. Retrieved June 23, 2016.

这样看下来更像是一个历史问题，IEC 在 1998 年才正式确立了 `KiB` 等单位的意义，而内核在更早的时候已经开始使用 $kB = 2^{10}$ 这个意义。

顺着 `/proc/meminfo` 这个伪文件系统的信息查下去，发现这个东西是 2.6 的内核版本里就有的东西，而很不幸的是——这是 2005 年发布的版本，在此之前使用的版本管理并不是 git。

在几乎碰到知识盲区的时候，我选择让 Codex 帮我继续追查线索。很显然在这方面 Codex 的知识充沛，工作完成的还挺出色。

> [!NOTE]
> 接下来的一些内容源于 Codex 的直接输出，并未实现 100% 的查证，请以批判的眼光阅读。

> 在 linux-0.99.tar.Z 的 linux/fs/proc/array.c 里已经有 get_meminfo()，而且
> array_read() 里已经把它挂到 proc 条目上

如今是 2026 年 4 月，那么 `/proc/meminfo` 的出现***已经是 33 年前了***

> 我核到的边界是：
>
> - linux-1.3.0 里的 fs/proc/array.c，get_meminfo() 还没有 kB 标注，只输出原始
>   数值
> - linux-1.3.100 里的 fs/proc/array.c 已经明确写成：
>     - "MemTotal: %8lu kB\n"
>     - "MemFree: %8lu kB\n"
>     - 数值转换直接用 >> 10 和 << (PAGE_SHIFT - 10)
>
> 也就是在这个实现里，kB 明确就是按 1024 字节算，不是十进制的 1000 字节。
>
> 你可以把结论理解成：
>
> - 对 Linux 这个用户可见接口语境，kB = 2^10 的用法，至少在 1996-05-10 对应的
>   1.3.100 时代就已经存在
> - 很可能更早，但我目前确认到的可靠下界是这里
>
> 我查到的归档来源：
>
> - linux-1.3.0.tar.gz
>   https://mirrors.edge.kernel.org/pub/linux/kernel/v1.3/linux-1.3.0.tar.gz
> - linux-1.3.100.tar.gz
>   https://mirrors.edge.kernel.org/pub/linux/kernel/v1.3/linux-1.3.100.tar.gz
> - linux-2.0.tar.gz
>   https://mirrors.edge.kernel.org/pub/linux/kernel/v2.0/linux-2.0.tar.gz

确实是历史的残响了。
