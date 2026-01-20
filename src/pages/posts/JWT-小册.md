---
title: JWT 小册
date: 2024-02-21 20:52:14
tags:
  - 笔记
  - 技术
---

JWT（JSON Web Token） 是一种分布式、跨域的单点登录方式，他开销很小而且天然支持分布式。

<!-- more -->

十分实用呐！[^0]

## 结构

JWT 以 `.` 作为分割，储存以下内容

- Header：标识 JWT 的基本信息，比如算法等
- Payload：负载，在这里会承载 JWT 的基础要素
- Signature：签名，当 JWT 被恶意修改时将会无法验证，此时判定 JWT 失效

举个例子，典型的 JWT 应该是长成下面这样子

```txt
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Header

这里的字段是相对固定的：算法和 Token 类型

举个例子，使用 `HS256` 的算法的 JWT 的 Header 应该是如下样式

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload

常见的 Payload 字段有 7 个，所有的字段名都尽可能缩减为 3 个字母

如下表格即是 7 个标准 Payload 字段的定义以及是否可选

| 字段名 |      备注      | 是否可选 |
| :----: | :------------: | :------: |
|  exp   |    过期时间    |    ❎    |
|  iss   |     发布者     |    ✅    |
|  sub   |      主题      |    ✅    |
|  aud   |     接收者     |    ✅    |
|  nbf   | 在此之前不生效 |    ✅    |
|  iat   |    发布时间    |    ✅    |
|  jti   |   JWT 的 ID    |    ✅    |

除此之外还有很多其他的常用字段[^1]。

### Signature

对于一串 Payload，我们使用密钥计算出他的签名，若是 Payload 被篡改那么签名也会不一致

如果签名不一致，那么就可以认为 Token 被篡改了

## 签名算法

一般情况下使用 `HMAC` 足矣，但是有些为了特别安全的情况可以使用 `RSA` 或者 `ECDSA`

## 传输与储存方式

JWT 可以储存在 HTTP 请求的 Header 里，这是最方便的：

```txt
Authorization: Bearer <token>
```

当然，HTTP 是明文传输这是十分不安全的，所以应该是有加密层的传输最好。

除此之外，也可以填入在请求体的某个字段里，不过这不是推荐的方式：

```json
{
    "jwt": <token>,
    ...
}
```

<!-- reference -->

[^0]: [看看 jwt.io](https://jwt.io/)

[^1]: [Wikipedia JWT](https://en.wikipedia.org/wiki/JSON_Web_Token#Standard_fields)
