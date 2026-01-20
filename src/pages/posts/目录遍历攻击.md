---
title: 目录遍历攻击
date: 2021-10-27 17:07:49
tags:
  - 网络安全
---

在进行 Reposite 开发的过程之中遇到了访问本地文件的需求，同时又需要暴露文件。在查看 rocket.rs 的文档寻找这部分文档之时知道了 _目录遍历攻击(directory traversal attack)_ 。

<!--more-->

## 形成攻击

假设我们提供了一个 http 服务器，他可有访问静态文件的功能，您可以用 GET 方法访问 API 获取文件。这里使用 Rust 的 rocket.rs 框架功能演示。

```rust
#[get("/page/<path..>")]
fn get_page(path: PathBuf) { /* ... */ }
```

假设我们的程序执行位置为 `/home/iced/reposite/` ，那么我们使用以下 GET 方法

```http
GET http://127.0.0.1:8000/page/../../../etc/passwd
```

就可能访问到敏感文件。

同时由于 [URL 转义](https://www.w3cschool.cn/htmltags/html-urlencode.html)，以下请求是等效于以上请求的

```http
GET http://127.0.0.1:8000/page/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc/passwd
```

```http
GET http://127.0.0.1:8000/page/%2e%2e/%2e%2e/%2e%2e/etc/passwd
```

## 如何解决？

根据以上分析，以及 rocket.rs 的文档来看，我们有三种下手解决他的办法。

- 由框架解决
- 从参数上解决
- 手动识别路径
- 容器化

### 使用框架提供的功能

rocket.rs 提供[静态文件服务](https://rocket.rs/v0.5-rc/guide/requests/)，他们推荐使用这个服务替代手写的访问文件功能。

### 编写 PathWarden

假设程序运行目录为`/home/iced/reposite/`，传入的 http 请求想要访问`../../../etc/passwd`，此路径永远为相对路径。

我们可以把参数给转换为绝对路径`/home/iced/reposite/../../../etc/passwd`，在展开路径后变成了`/etc/passwd`。

注意到了吗，到这里位置这个路径已经不包含程序运行目录，他访问越界了。于是在这里我们可以直接判断目标路径是否包含程序运行目录。如果包含的话允许访问，如果不包含的话立刻返回 http 状态码 `416`，`404` 等

### 参数禁止

不允许请求访问的文件目录中包含`../`，`%2e%2e/`，`%2e%2e%2f`等特殊字符组合。如果包含的话立刻返回 http 状态码 `416`，`404` 等

### 容器化

容器作为隔离资源的一种方案也能有效简单的解决这个问题。

假设容器内`/home/reposite/`被挂载上了内容作为工作目录，那么如果访问越界的话只会访问到容器内的内容，并不会对主机造成实质性伤害。
