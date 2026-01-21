---
title: 简单地使用 Caddy 实现 CORS 配置
date: 2025-04-27 23:49:41
tags:
  - 运维
---

其实可以在后端实现 CORS 配置，但是在后端实现 CORS
不算是很方便管理。既然已经使用了 Caddy，那为什么不利用强大的 Caddy 实现 CORS
配置？

<!-- more -->

查阅文档发现 Caddy 本身不支持直接写 CORS 的配置，但是 CORS 基本上是使用 HTTP
Header 来实现的[^0]，所以我们应该只需要写对应的 HTTP Header 就行了:

```txt
:80{
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE"
        Access-Control-Allow-Headers "Content-Type"
    }
    ...
}
```

然后我发现了个更奇妙的写法：Caddy 有 snippet[^1]，利用 snippet
一样可以做到这样的效果并且可移植性更好（大概？）

下面这段粘贴复制出去就可以用了，非常方便

```txt
(cors) {
  @cors_preflight method OPTIONS
  @cors header Origin {args.0}

  handle @cors_preflight {
    header Access-Control-Allow-Origin "{args.0}"
    header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE"
    header Access-Control-Allow-Headers "Content-Type"
    header Access-Control-Max-Age "3600"
    respond "" 204
  }

  handle @cors {
    header Access-Control-Allow-Origin "{args.0}"
    header Access-Control-Expose-Headers "Link"
  }
}
```

然后在站点配置里如下引用：

```txt
:80 {
    import cors *

    handle_path /* {
        reverse_proxy localhost:8080
    }
}
```

<!-- reference -->

[^0]: [MDN](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/CORS)

[^1]: [Caddy snippet](https://caddyserver.com/docs/caddyfile/concepts#snippets)
