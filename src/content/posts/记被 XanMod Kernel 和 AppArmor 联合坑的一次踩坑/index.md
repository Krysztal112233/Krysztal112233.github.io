---
title: 记被 XanMod Kernel 和 AppArmor 联合坑的一次踩坑
date: 2026-03-17 00:16:09
tags:
    - 笔记
    - Linux
    - 容器
---

排查了下自己的 NAS 上 `immich` 为什么突然没办法拉起。

<!-- more -->

## immich 排障记录

podman 给了如下的报错信息：

```text
profile "containers-default-0.64.2" specified but AppArmor is disabled on the host
```

嗯。。。看起来是 AppArmor 被关掉了导致的，但是在此之前 podman 是正常运行的。

当时运行的是 `6.18.16-x64v3-xanmod1`，`podman info` 显示 `apparmorEnabled=false`，而容器启动时被分配了默认的 AppArmor profile，因此报错：

进一步检查发现，机器虽然安装了 AppArmor 用户态包，内核也编译了 AppArmor 支持，但当前启动出来的 LSM 链里没有 `apparmor`，所以宿主机实际上处于 AppArmor 未启用状态。这导致 podman 创建出的 immich 容器可以生成，但在启动阶段失败。

检查了一下 LSM 的情况：

```bash
❯ cat /sys/kernel/security/lsm
capability,landlock,lockdown,yama,bpf
```

我的 NAS 里的系统内核是 XanMod，考虑到可能是内核编译参数导致的问题，因此把系统切回 Debian 提供的内核。

完成后，运行内核变成 `6.19.6+deb14-amd64`，这时 `apparmorEnabled=true`，说明 AppArmor 问题已经消失。所以初步结论是，LSM 链里的 `apparmor` 没有正常工作。

现在容器已经可以正常启动，说明 Debian 的官方内核是没有问题的。

随后又检查了服务器在切回 Debian 内核之后的 LSM 工作状态：当前运行内核是 `6.19.6+deb14-amd64`，`/sys/kernel/security/lsm` 显示当前启用的 LSM 链为：

```bash
❯ cat /sys/kernel/security/lsm
lockdown,capability,landlock,yama,apparmor,tomoyo,bpf,ipe,ima,evm
```

确定了 `apparmor` 已经在链上，而且状态正常：

- `/sys/module/apparmor/parameters/enabled` 为 `Y`
- `podman info` 显示 `apparmorEnabled=true`

检查一下 `aa-status` 命令的情况

```bash
❯ aa-status | rg container
   containers-default-0.64.2
   containers-default-0.66.0
   /usr/local/bin/valkey-server (115513) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (115655) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (116222) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (116278) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (116279) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (116280) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (116282) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (116283) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (116284) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (119091) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (119092) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (119093) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (119094) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (119098) containers-default-0.64.2
   /usr/lib/postgresql/14/bin/postgres (119099) containers-default-0.64.2
   /usr/bin/tini (115612) containers-default-0.66.0
   /usr/local/bin/python3.11 (115681) containers-default-0.66.0
   /usr/bin/tini (116011) containers-default-0.66.0
   /usr/local/bin/node (116047) containers-default-0.66.0
   /usr/local/bin/python3.11 (116546) containers-default-0.66.0
   /usr/local/bin/python3.11 (116788) containers-default-0.66.0
   /usr/local/bin/node (118708) containers-default-0.66.0
```

其中容器相关的 `containers-default-0.64.2` 和 `containers-default-0.66.0` profile 都已经加载。起码现在看起来是工作正常的。

这说明现在服务器的 LSM 尤其是 AppArmor 已经工作正常，podman 容器也能够正常使用 AppArmor profile，不再是之前那种宿主机未启用 AppArmor 导致容器启动失败的状态。

## 本机 XanMod 内核下的 LSM 检查

顺手也检查了本机的 LSM 状态。本机运行的是 `6.9.12-x64v4-xanmod1`，和刚才服务器之前使用的 XanMod 不是同一颗内核，但同属于 Xanmod 内核发行版。

当前本机的 `/sys/kernel/security/lsm` 内容为：

```text
❯ cat /sys/kernel/security/lsm
lockdown,capability,landlock,yama,apparmor,ima,evm
```

同时 `/sys/module/apparmor/parameters/enabled` 为 `Y`，说明本机这颗 XanMod 内核下 AppArmor 是正常启用的。

内核配置里也能看到：

- `CONFIG_SECURITY_APPARMOR=y`
- `CONFIG_DEFAULT_SECURITY_APPARMOR=y`
- `CONFIG_LSM="landlock,lockdown,yama,integrity,apparmor"`

不知道因为什么原因导致 XanMod 没有正常启用 AppArmor，还得是 Debian 的官方源里的内核稳定。。。
