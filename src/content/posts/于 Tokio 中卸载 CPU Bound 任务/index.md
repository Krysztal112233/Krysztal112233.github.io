---
title: 于 Tokio 中卸载 CPU Bound 任务
date: 2026-02-22 02:46:24
tags:
    - 笔记
    - 文章
---

记一次后端计算密集性能优化。

<!-- more -->

在 Rust 中使用 async/await 可以有效提升 IO 密集程序的吞吐量，因为大部分工作是可以挂起等待的。但是在一套系统中难免会有一些任务无法被挂起等待，这种任务通常是需要持续运算的计算密集型任务，也叫作 CPU-bound task。

因为我使用了 argon2id 来对密码进行哈希和验证，而 argon2id 是出了名的工作缓慢，是个很典型的计算密集型任务，混合在 IO 密集程序中会严重拖慢 IO 密集程序的工作速度，因此我们需要将其转移到 IO 任务池之外进行运行。

---

对一个计算密集的任务进行优化应尽可能从对代码更改影响较小的地方开始修改。

我们有如下代码：

```rust
// MORE...
    pub fn verify(&self, password: impl Into<String>) -> Result<bool, Error> {
        let password_hash = PasswordHash::new(&self.0)?;

        match DEFAULT_ARGON_CFG
            .clone()
            .verify_password(password.into().as_bytes(), &password_hash)
        {
            Ok(()) => Ok(true),
            Err(e) => match e {
                argon2::password_hash::Error::Password => Err(e.into()),
                _ => Ok(false),
            },
        }
    }
// MORE...
```

可以看到这个代码是使用了 argon2 对密码进行校验，是个非常典型的计算密集任务。

## 负载分离

我们可以将这部分代码转移到其他线程进行计算，能帮助我们完成这一点的工具是 `tokio::task::spawn_blocking`

> In general, issuing a blocking call or performing a lot of compute in a
> future without yielding is problematic, as it may prevent the executor from
> driving other futures forward. This function runs the provided closure on a
> thread dedicated to blocking operations. See the CPU-bound tasks and blocking
> code section for more information.
>
> Tokio will spawn more blocking threads when they are requested through this
> function until the upper limit configured on the Builder is reached. After
> reaching the upper limit, the tasks are put in a queue. The thread limit is
> very large by default, because spawn_blocking is often used for various kinds
> of IO operations that cannot be performed asynchronously. When you run
> CPU-bound code using spawn_blocking, you should keep this large upper limit
> in mind. When running many CPU-bound computations, a semaphore or some other
> synchronization primitive should be used to limit the number of computation
> executed in parallel.

既然现在知道了改造的初步逻辑，那么我们继续执行我们的计划吧。

```rust
// MORE
    pub async fn verify(&self, password: impl Into<String>) -> Result<bool, Error> {
        let password = password.into();
        let phc = self.0.clone();

        tokio::task::spawn_blocking(move || {
            let password_hash = PasswordHash::new(&phc)?;

            match DEFAULT_ARGON_CFG.verify_password(password.as_bytes(), &password_hash) {
                Ok(()) => Ok(true),
                Err(argon2::password_hash::Error::Password) => {
                    Err(Error::Password(argon2::password_hash::Error::Password))
                }
                Err(_) => Ok(false),
            }
        })
        .await?
    }
// MORE
```

可以看到修改其实非常简单。但是要注意了，送入 `tokio::task::spawn_blocking` 的任务是会一起运行的，因此我们需要对其进行一些限制避免压力太大搞爆服务器。

## 使用信号量

根据 tokio 的官方文档以及我们的常识，我们可以使用信号量 `Semaphore` 来达到这一点：

```rust
// MORE
    static MAX_CPU_BOUND_SEMAPHORE: LazyLock<Semaphore> = LazyLock::new(|| Semaphore::new(num_cpus::get() * 2));

    pub async fn verify(&self, password: impl Into<String>) -> Result<bool, Error> {
        let password = password.into();
        let phc = self.0.clone();

        tokio::task::spawn_blocking(move || async move {
            // NOTE: The consts::MAX_CPU_BOUND_SEMAPHORE will not be closed forever
            let _ = MAX_CPU_BOUND_SEMAPHORE.acquire().await;

            let password_hash = PasswordHash::new(&phc)?;

            match DEFAULT_ARGON_CFG.verify_password(password.as_bytes(), &password_hash) {
                Ok(()) => Ok(true),
                Err(argon2::password_hash::Error::Password) => {
                    Err(Error::Password(argon2::password_hash::Error::Password))
                }
                Err(_) => Ok(false),
            }
        })
        .await?
        .await
    }
// MORE
```
