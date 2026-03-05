---
title: 活着的 Arc
date: 2026-03-06 00:02:34
tags:
    - 实用
    - 笔记
---

在翻阅其他的 Rust 项目时看到了一个关于 `Arc` 的有趣用法，故写下本篇文章特此记录

<!-- more -->

在 Rust 中关于一个结构体，会自动派生 `Drop` 来实现资源释放。

在有些情况下我们可能会在一个后台任务所属的结构体中放入一个标记来检查是否已经被 `drop` 掉：当被 `drop` 掉的时候后台任务即退出。

那我们可以写出如下写法：

```rust
#[derive(Clone)]
struct Background {
    dropped: Arc<AtomicBool>,
}

impl Drop for Background {
    fn drop(&mut self) {
        self.dropped.store(true, Ordering::Relaxed);
    }
}

impl Background {
    fn new() -> Background {
        let dropped = Arc::new(AtomicBool::new(false));

        let instance = Background {
            dropped,
        };

        let dropped_for_task = instance.dropped.clone();

        tokio::spawn(async move {
            let mut tick = tokio::time::interval(Duration::from_millis(100));
            tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

            loop {
                tick.tick().await;

                if dropped_for_task.load(Ordering::Relaxed) {
                    break;
                }
                // DO SOMETHING...
            }
        });

        instance
    }
}
```

嗯，看起来没有任何问题。

- 后台任务启动后会判断是否已经被 `drop`
- 所有从 `Background` 克隆的对象都能正确的共享数据

一切都那么的岁月静好。直到你的 `Background` 实例被 `clone` 后并且 `drop` 掉，一切都炸开花了。

## 为什么？

原因很简单：`dropped` 被 `drop` 后被立刻设置了 `true`，而并没有判断是不是真正的所有持有 `Background` 对象的结构体是不是都已经完成了使命。

考虑到这个场景很难想象，我们使用一种分发的模式来进行简单解释：

```rust
// “分发”：同一个 Background 会被 clone 给多个使用方
async fn dispatcher(background: Background) {
    let a = background.clone();
    let b = background.clone();

    // A 先完成使命并被 drop
    drop(a);

    // 正如我所说，Drop 里没有判断“是不是最后一个持有者”，
    // 所以 a 的 drop 会把 shared 的 dropped 直接置为 true，
    // 导致后台 loop 以及 b/background 也一起被处理掉。
    assert!(b.dropped.load(Ordering::Relaxed));
}
```

这个场景在一些情况下非常常见：

- 在 Axum 中分发状态到端点逻辑，但 Axum 在分发状态时实际上是对数据进行 `clone`
- 类似的，所有 `dispatcher` 模式都会受到影响

## 何所归？

我们还是要从引用计数上入手。

- 当引用计数归 0 时我们可以认为所有的引用已经消失了
- 与此同时，我们还需要避免自身持有引用导致无法判定为引用全部被 `drop`

因此，我们可以引入一个 `alive: Arc<()>` 字段来解决这个问题。

在进行改写之后，我们可以得到如下代码：

```rust
#[derive(Clone)]
struct Background {
    dropped: Arc<AtomicBool>,
    alive: Arc<()>,
}

impl Drop for Background {
    fn drop(&mut self) {
        self.dropped.store(true, Ordering::Relaxed);
    }
}

impl Background {
    fn new() -> Background {
        let dropped = Arc::new(AtomicBool::new(false));
        let alive = Arc::new(());

        let instance = Background {
            dropped,
            alive,
        };

        let dropped_for_task = instance.dropped.clone();
        let alive_for_task = Arc::downgrade(&instance.alive);

        tokio::spawn(async move {
            let mut tick = tokio::time::interval(Duration::from_millis(100));
            tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

            loop {
                tick.tick().await;

                if dropped_for_task.load(Ordering::Relaxed) {
                    break;
                }

                if alive_for_task.upgrade().is_none() {
                    dropped_for_task.store(true, Ordering::Relaxed);
                    break;
                }

                // 再次检查 dropped：避免在真正执行工作前的竞态窗口里被 drop 后仍多跑一次。
                if dropped_for_task.load(Ordering::Relaxed) {
                    break;
                }

                // DO SOMETHING...
            }
        });

        instance
    }
}
```

这个技巧的关键点是：把是否还有持有者的判断交给引用计数，并且让后台任务本身不参与强记数。

> [!NOTE]
> 要记住，引用计数分为强记数和弱记数

- `alive: Arc<()>` 是否后台任务还活着的令牌。所有 `Background` 的 `clone` 都会共享它，因此 `alive` 的强记数就等价于还有多少个 `Background` 还没有被 `drop`。
- 后台任务不要 `clone()` 这个 `Arc`，而是用 `Arc::downgrade(&alive)` 拿到 `Weak<()>`。`Weak` 不会增加强记数，所以不会因为后台任务本身的引用而导致引用计数永远归不了 0。
- 当所有 `Background` 的克隆都被释放后，`Weak::upgrade()` 会返回 `None`，后台任务就能确定“没有任何持有者了”，于是安全退出 loop。
