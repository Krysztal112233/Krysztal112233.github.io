---
title: 使用 Quadlet 将 Podman 中的 Postgres 当作 systemd 服务运行
date: 2026-06-05 01:49:34
tags:
    - 容器
    - Postgres
    - DevOps
    - Linux
    - 教程
    - 安全
---

这段时间在准备部署项目的数据库，但考虑到项目中包含多个服务，如果每个服务都使用其对应的 Postgres 数据库，那么会导致备份非常麻烦。

<!-- more -->

## 考量

在最开始我打算基于 Debian 官方的 Postgres Packaging Flavor 对我需要的拓展进行打包，但是发现 Debian Trixie 的 Postgres 是 Postgres17，而项目里的服务均使用 Postgres18 并且利用了相当一部分 UUIDv7 的特性。

于是在如下考量下决定使用容器化的方式来运行，Podman 支持使用 Quadlet 的方式将容器服务化，这样我们就可以不用维护我们自己的拓展打包了，并且可以直接使用 Postgres18：

- 需要 `pgvector` 拓展实现向量搜索
- 需要 `pgmq` 拓展实现消息队列
- 需要 `partman` 拓展实现自动分区

其中 pgmq 并不存在于 Debian 的 Postgres Packaging 中，因此还是决定随着容器化比较好

## Quadlet? Quadlet!

在不久前我在使用 Docker 容器有遇到容器被入侵的事件，对此心有余悸，因此还是打算使用 Podman 这样的 rootless 容器化工具。

根据 Podman Quadlet 的文档，Quadlet 取代了先前的 `podman generate systemd` 命令，因此我们直接看 Quadlet 的用法即可

### Quadlet 搜索目录

我们主要使用 `rootless` 用法，其搜索路径为

- `$XDG_RUNTIME_DIR/containers/systemd/`
- `$XDG_CONFIG_HOME/containers/systemd/` 或 `~/.config/containers/systemd/`
- `/etc/containers/systemd/users/${UID}`
- `/etc/containers/systemd/users/`
- `/usr/share/containers/systemd/users/${UID}`
- `/usr/share/containers/systemd/users/`

根据我的癖好，我选择在 `~/.config/containers/systemd/` 中编写

### Quadlet 写法

Quadlet 的工作原理是将 `.container` 文件翻译为 `.service` 文件，使用的文法倒是和 `.service` 文件非常相似。我来举个简单的例子：

```ini
[Unit]
Description=PostgreSQL RDBMS
After=network-online.target

[Container]
Image=docker.io/postgres:18-trixie
ContainerName=postgres
Volume=/data/postgresql:/var/lib/postgresql/18/docker:Z
PublishPort=5432:5432
Network=host

Environment=POSTGRES_PASSWORD=XnNxBlaowPTOJD4PWvY9qHG5CoXwqjMp

[Service]
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

这样就创建好了最简单的 Postgres Quadlet 了

## Postgres 加固

小提醒，你在 Quadlet 中明文写密码是有可能被系统里的其他用户读取到的，因此我们需要使用更安全的方式来隐藏起密码。

以及我们需要对 Postgres 的网络进行一些配置。

### Quadlet 加固

最简单的方式是利用 Podman 提供的 secret 功能进行加固，Postgres 恰好又支持通过 secret 来配置自身，那么我们可以替换我们 Quadlet 中的 `POSTGRES_PASSWORD` 环境变量为 `POSTGRES_PASSWORD_FILE` 环境变量。

首先我们需要创建一个 Secret：

```bash
# 可以从 stdin 创建
 echo -n 'XnNxBlaowPTOJD4PWvY9qHG5CoXwqjMp' | podman secret create postgres_password -

# 也可以从文件中创建
 echo -n 'XnNxBlaowPTOJD4PWvY9qHG5CoXwqjMp' > /tmp/postgres_password.txt && podman secret create postgres_password /tmp/postgres_password.txt && rm /tmp/postgres_password.txt
```

> [!NOTE]
> 请注意，命令的开头我引入了一个空格，这样做的目的是为了避免被写入到 shell 的历史记录中。
>
> 为了做到这一点，你还需要单独配置你的 shell 使得其可以支持：
>
> ```bash
> # 对于 .bashrc
> HISTCONTROL=ignorespace
>
> # 对于 .zshrc
> setopt hist_ignore_space
> ```

就这样我们得到了一个叫做 `postgres_password` 的 secret。

随后我们进行如下字段替换：

```ini
# 把这个换掉
Environment=POSTGRES_PASSWORD=XnNxBlaowPTOJD4PWvY9qHG5CoXwqjMp

# 换成
Environment=POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
Secret=postgres_password
```

这样我们就成功的把可能被其他用户读到的 `.service` 安全化了

### 联网访问权限加固

联网访问权限主要对于 “谁可以链接到 Postgres” 这个命题。

考虑到我们有两个使用条件

- 外部网络链接
- 内部服务使用

TODO
