---
title: 实用命令切片
date: 2026-01-10 18:45:34
tags:
  - 笔记
  - 实用工具
---

记录一下我常用的比较奇技淫巧的实用命令切片 XD

<!-- more -->

## 使用管道通过 SSH 传输目录

在常用的情况下一般是使用 `tar` 命令打包目录然后 `scp` 到远程主机再解压，通过这个操作复制需要三个步骤：打包，登录，解压

我们注意到 `tar` 命令有管道能力，于是我们可以利用管道能力来把这几个操作压缩成为一个操作：

```bash
tar -cJf - [目录名] | ssh [主机信息] "mkdir -p [目标目录] && xz -d | tar -C [目标目录] -xpf -"
```

## 检查管道中传输数据的进度

有的时候可能会想在管道操作中查看数据的进度，毕竟大多数的时候管道是没有输出进度的，我们可以使用 `pv` 命令来解决这个问题：

```bash
tar -cJf - [目录名] | pv | ssh [主机信息] "mkdir -p [目标目录] && xz -d | tar -C [目标目录] -xpf -"
```

## 使用管道通过 SSH 传输 Podman/Docker 镜像

注意到 `podman` 和 `docker` 的 `save` 子命令是会输出到标准输入输出的，于是我们可以将其直接管道到远程主机直接加载：

```bash
podman save [镜像信息] | ssh [主机信息] 'podman load'
```

在这个时候是没有压缩的（可能是有但是太小了），我们可以引入 `xz` 命令来压缩，这样就可以节约传输的带宽：

```bash
podman save [镜像信息] | xz -z -T0 | ssh [主机信息] 'xz -d | podman load'
```

我们引入上面的 `pv` 命令用法，可以看到数据确实是有压缩

```bash
➜  forks podman save ... | pv | ssh ... 'podman load'
92.1MiB 0:00:06 [15.1MiB/s] [      <=>                                        ]

➜  forks podman save ... | xz -z -T0 | pv | ssh ... 'xz -d | podman load'
20.9MiB 0:00:06 [3.14MiB/s] [ <=>                                             ]
```
