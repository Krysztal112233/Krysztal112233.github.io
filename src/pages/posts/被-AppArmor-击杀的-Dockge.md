---
title: 被 AppArmor 击杀的 Dockge
date: 2025-10-12 23:00:30
tags:
  - 杂项
  - 操作系统
---

Debian 自从 Debian10 后开始默认启用了 AppArmor，这是另外一个和 SELinux 类似的 MAC(Mandatory Access Control) 实现，但他有更容易被人类所接受的配置颗粒度，并且由社区开发，而且很容易关掉（不推荐你关掉）

<!-- more -->

在默认情况下 Debian 的 AppArmor 运行情况是不会干扰用户的正常操作的，但是在有些时候他会突然给你一拳告诉你你不能这样做，这样违反了约束。

然而这完全是 Debian 的原因吗？

---

好吧，我遇到了。在 Debian13 上如果不去新增 AppArmor 配置就会无法运行 Dockge 这个还挺不错的 Compose 管理器。

除此之外，还有 `lscr.io/linuxserver/qbittorrent` 这个容器也受到了影响——可能更多，但我没有继续测试。

## 初探

我们通过命令 `dmesg | rg apparmor | rg denied` 得到了输出

```bash
[ 2661.149627] audit: type=1400 audit(1759760495.520:84): apparmor="DENIED" operation="create" class="net" info="failed protocol match" error=-13 profile="docker-default" pid=15527 comm="node" family="unix" sock_type="stream" protocol=0 requested="create" denied="create" addr=none
[ 2674.109757] audit: type=1400 audit(1759760508.479:85): apparmor="DENIED" operation="create" class="net" info="failed protocol match" error=-13 profile="docker-default" pid=15712 comm="node" family="unix" sock_type="stream" protocol=0 requested="create" denied="create" addr=none
[ 2699.872327] audit: type=1400 audit(1759760534.241:86): apparmor="DENIED" operation="create" class="net" info="failed protocol match" error=-13 profile="docker-default" pid=15897 comm="node" family="unix" sock_type="stream" protocol=0 requested="create" denied="create" addr=none
[ 2751.237225] audit: type=1400 audit(1759760585.607:87): apparmor="DENIED" operation="create" class="net" info="failed protocol match" error=-13 profile="docker-default" pid=16081 comm="node" family="unix" sock_type="stream" protocol=0 requested="create" denied="create" addr=none
[ 2811.399220] audit: type=1400 audit(1759760645.767:88): apparmor="DENIED" operation="create" class="net" info="failed protocol match" error=-13 profile="docker-default" pid=16269 comm="node" family="unix" sock_type="stream" protocol=0 requested="create" denied="create" addr=none
[ 2871.560585] audit: type=1400 audit(1759760705.928:89): apparmor="DENIED" operation="create" class="net" info="failed protocol match" error=-13 profile="docker-default" pid=16472 comm="node" family="unix" sock_type="stream" protocol=0 requested="create" denied="create" addr=none
```

接下来诡异的事情来了：我没有在任何地方发现任何一个叫作 `docker-default` 的配置文件，完全不存在于标准的 `/etc/apparmor.d/` 中：

```bash
➜  dockge ls /etc/apparmor.d/ | rg docker
➜  dockge
```

怎么办？

## 再探

我觉得这个问题的关键词应该是 `Docker`, `AppArmor`。于是我的第一反应是像 GPT 求助——很可惜它没有给我预期响应。

于是我直接使用搜索引擎进行搜索，第一项便是如下链接：

- [Docker 的 AppArmor 安全配置文件](https://docs.docker.com/engine/security/apparmor/)

很好，这就是我想要的。但也不完全是，因为这里面没有说解决方案，相反给了个巨复杂的文件

再做搜寻，我看到了这个

- [如何在 Debian 上禁用 docker-default](https://lucascavalare.github.io/2020-03-15-AppArmor_Docker/)

他的解决方案是想办法让 Docker 不再动态生成 `docker-default` 这个配置。我觉得这个已经很接近我想要的答案了，但我觉得不够完美

## 终曲

我们现在得到了两个方案：

- 调整 Docker 的安全配置
- 关闭 AppArmor 对于 Docker 的管控

### 调整 Docker 的安全配置

我这里列出 compose.yml （也就是 docker-compose.yml 的高版本别名）中如何调整相关设定：

在修改之前：

```yaml
services:
  dockge:
    image: louislam/dockge:nightly
    restart: unless-stopped
    ports:
      - 5001:5001
    volumes:
      - ./data:/app/data
      - /pool/striping/dockge/stacks:/pool/striping/dockge/stacks
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - DOCKGE_ENABLE_CONSOLE=true
      - DOCKGE_STACKS_DIR=/pool/striping/dockge/stacks
```

在修改之后，请注意新添加的 `security_opt` 字段

```yaml
services:
  dockge:
    image: louislam/dockge:nightly
    restart: unless-stopped
    ports:
      - 5001:5001
    volumes:
      - ./data:/app/data
      - /pool/striping/dockge/stacks:/pool/striping/dockge/stacks
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - DOCKGE_ENABLE_CONSOLE=true
      - DOCKGE_STACKS_DIR=/pool/striping/dockge/stacks
    security_opt:
      - apparmor:unconfined
```

### 关闭 AppArmor 对于 Docker 的管控

我不建议你这样做，别看了。

如果你真的要这样做的话，请参照这篇文章根据你的需求调整: [如何在 Debian 上禁用 docker-default](https://lucascavalare.github.io/2020-03-15-AppArmor_Docker/)

以及另外一个方式，让 Docker 彻底不使用 AppArmor

```bash
systemctl edit docker
```

随后键入

```
[Service]
Environment=container="disable apparmor"
```

## 本源

在不断的探索中我发现一个很奇怪的现象：为什么我的工作用系统同为 Debian，但我的 NAS 却表现出了几乎完全不同的行为？

难道是 Debian 在某个版本产生了 Breakings？这并不太现实，因为两个设备都是 Debian Testing，一旦产生 Breakings 则会导致大家都出现错误。

于是我在不断的对比之下终于发现了不同：莫非是 NAS 上的 Debian 的内核的区别导致的？我记得我的 NAS 为了使用 ZFS 安装了 Proxmox 的 Linux 内核。

### Proxmox 的手册是如何说这件事的？

Proxmox 的[手册](https://pve.proxmox.com/pve-docs/pve-admin-guide.html#chapter_pct)里有这样一段话：

> While it can be convenient to run “Application Containers” directly as
> Proxmox Containers, doing so is currently a tech preview. For use cases
> requiring container orchestration or live migration, it is still recommended
> to run them inside a Proxmox QEMU virtual machine.
>
> 尽管直接将“应用容器”作为 Proxmox
> 容器运行可能颇为便捷，但目前这仍属于技术预览阶段。对于需要容器编排或实时迁移的用例，我们仍然建议将其运行在
> Proxmox QEMU 虚拟机内部。

也就是说这部分功能实际上是由 PVE 接管了的，因此会造成非常多的问题——但我好像还是没有搞懂为什么，论坛上指出可能是 Proxmox 的网络规则导致，并且有其独特的 LXC 规则因此不支持 Docker：

- [How difficult are Dockers to setup on Proxmox?](https://www.reddit.com/r/Proxmox/comments/16h9n0h/how_difficult_are_dockers_to_setup_on_proxmox/)
  - The isolation on both on proxmox leaves a bit to be desired. NFS shares
    and mounts continue to cause issues. Particularly in CTs. If a docker stack
    gets a reference to a filesystem which then goes away it can become kernel
    locked and will never, ever let go of that filesystem until you do a
    complete reboot of the PVE node.
  - Proxmox 上的隔离机制还有些不尽如人意。NFS
    共享和挂载持续引发各种问题，尤其是在 CT 容器中尤为突出。如果某个 Docker
    堆栈引用了一个文件系统，而该文件系统随后又消失了，那么它就可能彻底卡死内核，而且无论如何都不会再释放这个文件系统，除非你彻底重启整个
    PVE 节点。
- [Docker and Proxmox side-by-side](https://forum.proxmox.com/threads/docker-and-proxmox-side-by-side.33349/)
  - Running Docker in LXC is not recommended or supported on Proxmox VE (you will run in many issues).
  - 在 Proxmox VE 上，在 LXC 中运行 Docker 是不被推荐且不受支持的（你会遇到很多问题）。

我猜测其实可能并不是内核导致的，而是安装 Proxmox 是某些包引入的 iptables 规则导致的——毕竟我是从 Debian 安装的 Proxmox 而不是直接使用 ISO 安装的 Proxmox

### 深度探寻

在根据手册安装 Proxmox 的时候需要安装如下软件包：

- proxmox-ve
- postfix
- open-iscsi
- chrony

首先瞄准的目标必然是 `proxmox-ve` 这个包：里面大概率装了一大堆 Proxmox 的规则

TODO
