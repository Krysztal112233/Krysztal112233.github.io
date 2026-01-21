---
title: 如何挂载.img文件，以及如何使用QEMU模拟arm64环境
date: 2021-08-04 01:12:08
tags:
  - 技术
  - 捣鼓
---

在上一篇中编译 OpenCV 成功之后我把整个树莓派的 TF 卡使用 dd 命令导出成了 .img 文件作为备份。我会暂时有一段时间无法接触到我的树莓派，并且我还有很多步骤没有完成。

所以我就想是否能挂载到 x86 Linux host 上进行操作？

<!--more-->

## 如何 dd 出系统镜像文件？

使用大部分 Linux 发行版都自带的 dd 命令即刻。

想象一下当初你是如何使用 dd 命令制作 Linux 的 LiveCD 的？

```bash
sudo dd if=<the_path_to_ISO_file> of=/dev/sdx
```

其中 `/dev/sdx` 为**设备文件**，通常他们存在于 `/dev/` 目录之下.

那我们再想一想是不是可以反过来？

于是得出了以下命令：

```bash
sudo dd if=/dev/sdx of=rpimg.img
```

注意，这里必须为设备文件而不是设备分区文件，除非你想备份分区。

由于 TF 卡大小为 64GiB，换算为 GB 单位则为 60GB，是非常庞大的数据量，由于 Linux 系统调度的特性所以卡顿是很正常的现象。我的 TF 卡搭配 USB3.0 读卡器经过测试这个过程将会持续十分钟。

## 奇怪的想法

在思考是否可以在 x86 Linux host 上进行操作的时候我产生了一些疑问：

- 此时的 img 文件为何种格式？
- 是否可以使用 chroot 以及 QEMU 操作 img 文件内内容？

## 验证奇怪的想法

### QEMU 是否可以模拟运行 arm64（aarch64）？

经过资料的查找我们可以发现树莓派所使用的 SoC 为博通 BCM2711，大架构属于 ARM v8。

因此需要查找 QEMU 现在是否可以模拟 ARM v8

在 debian 的软件包搜索当中我们发现 `qemu-user-static` [软件包](https://packages.debian.org/bullseye/qemu-user)中有如下描述

> QEMU is a fast processor emulator: currently the package supports **ARM**, CRIS, i386, M68k (ColdFire), MicroBlaze, MIPS, PowerPC, SH4, SPARC and x86-64 emulation. By using dynamic translation it achieves reasonable speed while being easy to port on new host CPUs.
>
> This package provides the user mode emulation binaries. In this mode QEMU can **launch Linux processes compiled for one CPU on another CPU**.

感觉上大概是完全可以的。

选择 `user mode` 的 QEMU 而不是 `system mode` ，原因有二

1. 我们目标是挂载 img 并且使用 chroot 运行
2. 这里使用 chroot jail 并不需要启动整个系统，相对而言其实是一套软件，因此是用户态。

**另外这里并不是虚拟机。** chroot 本质上只是变更当前进程及其子进程的可见根路径。变更后，程序无法访问可见根目录外文件和命令。**chroot 的大欺骗战术！**

另外其实可以不使用 chroot，使用 Fakechroot 以及 PRoot 也是可以的

关于 PRoot 以及 Fakechroot 的用法可以参照以下链接

- [Fakechroot](http://manpages.ubuntu.com/manpages/precise/man1/fakechroot.1.html)
- [PRoot](https://wiki.archlinux.org/title/PRoot)

使用如下命令安装 `qemu-user-static`

```bash
sudo apt install -y qemu-user-static
```

他会自动配置 binary handle，如果执行的二进制文件架构是 qemu 支持的但是不是本机架构的话会自动使用 qemu 运行。

### img 文件分析

#### 逻辑

还记得上文中所提到的`设备文件`吗？在 Linux 当中把和设备交互的地方抽象成为了一个文件。

再联想一下 Linux 系统（乃至于各种 unix like 系统）当中的一个很大的特性：**一切皆文件**。

我们是从 TF 卡中完整的复制内容到 img 文件，那么是否在这个 img 文件当中包含了分区信息？

如果说我们知道了 img 文件当中的分区的起始点与结束点，那么他不就可以被抽象成为类似设备文件一样的东西了吗？

#### 验证由 dd 设备文件而来的 img 文件是否拥有完整的分区格式

祭出我们常用的`fdisk`命令，其堪称操作设备文件的瑞士军刀。

对 img 文件使用以下命令。我的 img 文件名为 rpios.img。

```bash
sudo fdisk -l rpimg.img
```

他输出了以下内容

```bash
Disk rpimg.img: 59.69 GiB, 64088965120 bytes, 125173760 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0xf9f150b0

Device     Boot  Start       End   Sectors  Size Id Type
rpimg.img1        8192    532479    524288  256M  c W95 FAT32 (LBA)
rpimg.img2      532480 125173759 124641280 59.4G 83 Linux

```

fdisk 对 img 文件成功读取了分区信息，并且认为他是一个**合法的设备**。

#### 挂载 img 文件，使其内部可以被操作

在[man pages](https://man7.org/linux/man-pages/man4/loop.4.html)上写道

> The loop device is a block device that maps its data blocks not
> to a physical device such as a hard disk or optical disk drive,
> but to the blocks of a regular file in a filesystem or to another
> block device. This can be useful for example to provide a block
> device for a filesystem image stored in a file, so that it can be
> mounted with the mount(8) command.

其上大概解释就是`loop device（回环设备）`是由`块设备`映射成的文件，

`mount`命令的 man pages 有如下一段解释

> If no explicit loop device is mentioned (but just an option `-o loop' is given), then mount will try to find some unused loop device and use that, for example
>
> mount /tmp/disk.img /mnt -o loop

但是他挂载的 img 文件是单分区的，而我们的 img 文件含有多个分区

> This type of mount knows about three options, namely loop, offset and sizelimit, that are really options to losetup(8). (These options can be used in addition to those specific to the filesystem type.)

所以如果我们镜像如果是多分区，我们可以使用 offset 和 sizelimit 参数来挂载。由于是最后一个分区所以我们就偷懒不写 sizelimit 了。

因此我们的命令就会如下

```bash
mkdir mp # 新建 img 文件挂载到的文件夹，把分区挂在这里
sudo mount ./rpimg.img ./mnt -o loop,offset=$((532480 * 512)) -t ext4
```

> 有可能遇到 loop 设备被占用的情况，这个时候我们需要使用 losetup -f 命令获取哪个 loop 设备可用。

由于第一个分区是启动分区而且我们不操作他，所以我们不挂载他。

这里输入成功后是无回显的，证明他成功了

于是我们`ls mnt`看看

```bash
 bin  boot  data  dev  etc  home  lib  lost+found  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
```

是完整的根目录结构，意味着我们的目的成功了！

### 使挂载 img 后的内容成为 chroot jail

在 [debian wiki](https://wiki.debian.org/chroot) 上写了 chroot 的用法（英文）

同时 [arch wiki](<https://wiki.archlinux.org/title/Chroot_(%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87)>) 上也有 chroot 用法的介绍

最关键的部分如下

- 绑定 /sys 到 rootfs 的 sys 文件夹
- 绑定 /dev 到 rootfs 的 dev 文件夹
- 绑定 /proc 到 rootfs 的 proc 文件夹
- 复制本机的 DNS 服务器配置文件到 rootfs

其中由于树莓派系统的 rootfs 自带了 DNS 配置文件，所以我们不需要再复制本机的 DNS 配置文件。

因此我们可以得出以下命令

```bash
cd mnt                                  # 切换到 img 文件的挂载文件夹
sudo mount --bind /proc proc                 # 挂载 proc
sudo mount --bind /dev dev                   # 挂载 dev
sudo mount --bind /sys sys                   # 挂载 sys
#cp -L /etc/resolv.conf etc/resolv.conf # 复制 DNS 配置文件，可选
```

最后我们尝试使用 chroot 启动他。

```bash
sudo chroot . /bin/bash
```

可以看到标识符发生了变化，那么意味着我们成功的挂载了 img 文件并且进入了其中。

### 卸载 img 文件的挂载

当我们对 img 文件操作完毕后需要卸载 img 文件的挂载才算是完成了工作。

当然最简单的方法就是重启系统了，全自动卸载。我们这里使用手动卸载节约时间

```bash
sudo losetup -d /dev/loop0  # 卸载回环设备
sudo umount ./mnt/dev       # 卸载 dev 绑定
sudo umount ./mnt/proc      # 卸载 proc 绑定
sudo umount ./mnt/sys       # 卸载 sys 绑定
sudo umount ./mnt           # 卸载 img 文件挂载
sudo sync                   # 同步更改到磁盘
```

OK，大功告成。
