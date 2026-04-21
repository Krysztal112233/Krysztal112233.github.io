---
title: 浅记多因素身份认证
date: 2026-04-21 17:53:54
tags:
    - 笔记
    - 安全
    - 后端
---

TOTP 为什么不算非常安全？为什么在多因素验证中又算是第二因素中常用的因素？

<!-- more -->

## MFA，多因素身份认证

在 Wikipedia 中有比较完善的介绍，原文与译文如下

> Something the user has: Any physical object in the possession of the user, such as a security token (USB stick), a bank card, a key, a phone that can be reached at a certain number, etc.
> Something the user knows: Certain knowledge only known to the user, such as a password, PIN, PUK, etc.
> Something the user is: Some physical characteristic of the user (biometrics), such as a fingerprint, eye iris, voice, typing speed, pattern in key press intervals, etc.
>
> 用户拥有的物品：用户持有的任何物理对象，例如安全令牌 （U 盘 ）、 银行卡 、钥匙、可拨打特定号码的电话等。
> 用户知晓的信息：只有用户知道的特定信息，例如密码 、 个人识别码 、PUK 码等。
> 用户固有的特征：用户的某些生理特征（ 生物识别 ），例如指纹 、虹膜、声纹、 打字速度 、按键间隔模式等。

[Logto 整理了](https://docs.logto.io/zh-CN/end-user-flows/mfa)一个更好理解的表格，也顺便贴在这里：

> [!NOTE]
> 这张表格以 Logto 的支持情况为准，因此如果要更具体的就需要视情况考虑了

| 类型              | 含义         | 验证因素（Logto 支持）                           |
| ----------------- | ------------ | ------------------------------------------------ |
| 知识 (Knowledge)  | 你知道的东西 | 密码、邮箱验证码、备用码                         |
| 持有 (Possession) | 你拥有的东西 | 短信验证码、认证器应用 OTP、硬件 OTP（安全密钥） |
| 固有 (Inherence)  | 你自身的特征 | 生物特征，如指纹、面部识别                       |

在严格模型下 2FA 需要两个不同类型的因素才能算通过：

- 密码(知识) + OTP(持有)
- 备用码(知识) + 短信验证码(持有)
- ...

而在实践中往往使用两步验证即可，不严格要求使用两个不同因素。换句话来讲，常见实践中如下的验证模型也是可以的：

- 密码(知识) + 邮箱验证码(知识)
- 短信验证码(持有) + OTP(持有)
- ...

## 降级认证

在常见实现中的两步验证往往属于降级认证的模式，因为降级认证让用户在意外失去强因子认证的可能性之下有了恢复身份的机会。

降级认证的关键点在于，只能作为：

- 恢复机制
- 兜底机制
- 受控的紧急绕过流程

因为降级认证的安全程度并不如主认证路径：假想一下，如果你使用了 recovery code 恢复了账户，那系统又该如何相信这确实是你？

显而易见的，在这种降低的情况下不论如何账户的可信度均会降低，因此需要辅以严格的限制：

- 使用严格的重试次数，例如腾讯的验证码登录机制一天最多 10 次重试
- 在账户使用安全度非常低的机制破冰登录后应当对账户进行限制，要求账户重置认证因素或者在规定时间内使用另外一种更强的因素来证明自己的可信度
- 同上，但向管理员证明账户属于自己
- 在破冰流程结束后等待管理员批准

## 杂项：部分因素的安全性

以下安全性考虑均基于现代的互联网，使用 TLS 对流量进行加密并且使用最新的浏览器等。

且除了 Passkey 之外的认证因素均对社工诱导输入的抗性较差，较为容易遭受诱导输入和疲劳攻击。

### TOTP

[Time-based One-Time Password](https://en.wikipedia.org/wiki/Time-based_one-time_password) 为最推荐的主 2FA 手段，综合安全性最高（但不如强密码，因此应当结合使用）

由于 TOTP 的唯一性较高并且为算法生成，依赖密码管理器等安全基建。

在实践当中，TOTP 的 Secret 在服务端与客户端均需要储存：

- 常见的独立密码管理器均实现了比较高安全性的储存
- 服务端必须以加密方式储存 Secret

除此之外，TOTP 因为基于时间实现，因此也会受到重放攻击：一个验证码在一段时间内均有效，因此在一个验证码完成验证后则必须记录 TOTP 在相应的时间段中不再可用以防止重放攻击。

### 密码

没什么说的。请使用强密码。

除此之外，密码的储存方式也十分考究：在服务端中请使用专用的密码哈希来实现储存，当前安全度最高的为 `argon2id`，但速度偏慢。

关于这一点，可以查看 [OWSAP Cheatsheet 中的密码储存章节](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)。

## 杂项：TOTP 防重放

TOTP 的 token 计算是根据时间窗口进行的，通常有个参数叫做 `skew`，根据 `skew` 参数我们可以推算出传入的 token 消耗了哪儿个 `step`。

### 获取 `step`

基于 `totp_rs` 库，我们通过如下代码来验证 token 的同时知晓到底使用了哪儿个 `step`

```rust

#[derive(Debug)]
pub struct Totp(totp_rs::TOTP);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TotpVerifyResult {
    pub success: bool,
    pub matched_step: Option<u64>,
}

impl Totp {
    pub fn verify(&self, token: &str) -> Result<TotpVerifyResult, Error> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
        let current_step = now / self.0.step;
        let base_step = current_step.saturating_sub(self.0.skew as u64);
        let window = (self.0.skew as u64) * 2 + 1;

        for offset in 0..window {
            let step = base_step + offset;
            if self.0.generate(step * self.0.step) == token {
                return Ok(TotpVerifyResult {
                    success: true,
                    matched_step: Some(step),
                });
            }
        }

        Ok(TotpVerifyResult {
            success: false,
            matched_step: None,
        })
    }
}
```

以上代码实际上是 `totp_rs::TOTP::check` 的变体：

```rust
...
    /// Will check if token is valid given the provided timestamp in seconds, accounting [skew](struct.TOTP.html#structfield.skew)
    pub fn check(&self, token: &str, time: u64) -> bool {
        let basestep = time / self.step - (self.skew as u64);
        for i in 0..(self.skew as u16) * 2 + 1 {
            let step_time = (basestep + (i as u64)) * self.step;

            if constant_time_eq(self.generate(step_time).as_bytes(), token.as_bytes()) {
                return true;
            }
        }
        false
    }

    /// Will check if token is valid by current system time, accounting [skew](struct.TOTP.html#structfield.skew)
    pub fn check_current(&self, token: &str) -> Result<bool, SystemTimeError> {
        let t = system_time()?;
        Ok(self.check(token, t))
    }
...
```

原先的实现不返回具体是哪儿个 `step`，因此我们可以使用这种方法来获取到底是哪儿个 `step`。

### 实现防重放

在一个简单系统（单体应用）里，利用程序内缓存过期实现防重放是最简单的。我使用 `moka` 来实现防重放，结合 `moka` 的缓存过期机制。

```rust
use std::time::Duration;

use moka::{
    future::Cache,
    ops::compute::{CompResult, Op},
};
use uuid::Uuid;

#[derive(Debug, Hash, PartialEq, PartialOrd, Eq)]
struct TotpStepRecord {
    id: Uuid,
    matched_step: u64,
}

#[derive(Debug, Clone)]
pub struct TotpAntiReplay {
    cache: Cache<TotpStepRecord, ()>,
}

impl TotpAntiReplay {
    pub async fn consume(&self, id: Uuid, matched_step: u64) -> bool {
        let key = TotpStepRecord { id, matched_step };

        matches!(
            self.cache
                .entry(key)
                .and_compute_with(|entry| async move {
                    if entry.is_some() {
                        Op::Nop
                    } else {
                        Op::Put(())
                    }
                })
                .await,
            CompResult::Inserted(_)
        )
    }
}
```

结合了防重放机制后，我们的 TOTP 验证流程就变得更安全有效了：

- 首先通过密码验证返回 challenge ID
- 用户输入基于 TOTP 生成的 token
    - 如果验证成功则本 `step` 不再可用，被原子操作记录到 `cache` 中，被消耗掉
    - 如果验证失败则本次验证失败

注意，防重放是基于用户级别的，并非基于 challenge ID。
