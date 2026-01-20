---
title: 使用 debootstrap 与 schroot 构建一个纯净环境
date: 2024-07-12 18:42:16
tags:
  - 笔记
  - 学习
  - 技术
---

`chroot` 在系统工程和系统架构方面有很重大的作用，可以创建一个不是那么隔离的纯净环境，用于调试一些可能会污染宿主机环境的程序是十分方便的。

<!-- more -->

## 为什么不使用虚拟机？

使用虚拟机说实话挺不方便的，如果使用虚拟机的话需要单独开一片磁盘空间和各种配置。

很多环境下不需要如虚拟机那样的隔离空间（例如软件包构建与打包等），在这种环境下使用 `chroot` 就可以了。

事实上，在 Debian 的官方打包流程里也推荐使用 `chroot` 的派生工具 `schroot` 来打包程序[^0]，这样打包出来的程序可以认为在所有 Debian **_基础系统_**上是幂等的。

## 下一步......

我们接下来制作的，DebianWiki 里称之为 _Caged Debian_.

![Caged Debian](https://wiki.debian.org/SchrootPackaging?action=AttachFile&do=get&target=debian-cage.png)

首先需要安装两个必要软件包

```shell
apt install debootstrap schroot
```

然后变更 schroot 的配置

```shell
cp /etc/schroot/schroot.conf /etc/schroot/schroot.conf.old
```

```shell
nano /etc/schroot/schroot.conf
```

接下来填入这些内容，填的时候记得改用户名

```txt
[unstable-amd64]
description=debian unstable amd64
type=directory
directory=/srv/chroot/unstable-amd64
users=<YOUR_NAME>
root-groups=root
preserve-environment=true
```

在完成上一步后，就可以开始准备安装了

```shell
mkdir -p /srv/chroot/unstable-amd64
```

```shell
debootstrap --arch amd64 unstable /srv/chroot/unstable-amd64 https://deb.debian.org/debian
```

请注意，如果你使用的底层系统版本出现在 Debian UsrMerge 之前那么你只能使用本文发出时的 Debian Stable （Debian12）版本，否则你会遇到很多奇怪的问题比如说无法解压。

完成这一步后需要准备一下 Caged Debian：

```shell
chroot /srv/chroot/unstable-amd64
```

```shell
echo proc /proc proc defaults 0 0 >> /etc/fstab
```

在上一步是写的挂载 `/proc` 虚拟文件系统，这一步必须要做。

然后就可以进入环境了

```shell
schroot -c unstable-amd64 -u root
```

<!-- reference -->

[^0]: [DebianWiki: SchrootPackageing](https://wiki.debian.org/SchrootPackaging)
