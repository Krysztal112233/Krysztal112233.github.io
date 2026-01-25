---
title: Rust 的边界检查是否已经有很大的进步
date: 2025-07-08 02:24:09
tags:
    - 技术
    - 捣鼓
    - 笔记
    - PoC
---

最近又听到有人说 Rust
做不了高性能程序的原因是内插的边界检查会降低程序运行速度，我想这么多年了应该
Rust
开发团队不会不知道这个问题，因此做了个简单的实验来测试一下是不是这方面已经有了长足的进步

<!-- more -->

### 源码

我们有如下代码，该代码为`N 皇后问题`的算法实现

```rust
use std::time::{SystemTime, UNIX_EPOCH};

const N: i32 = 13;

fn clock_realtime() -> i64 {
    let start = SystemTime::now();
    let since_the_epoch = start
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards");
    since_the_epoch.as_millis() as i64
}

fn array_check(array: &[i32], row: i32) -> bool {
    if row == 0 {
        true
    } else {
        let x0 = array[row as usize];
        for y in 0..row {
            let x = array[y as usize];
            if x == x0 {
                return false;
            } else if x - x0 == row - y {
                return false;
            } else if x0 - x == row - y {
                return false;
            }
        }
        true
    }
}

fn queen() -> i32 {
    let mut array = [0; N as usize];
    let mut found = 0;
    let mut row = 0;
    let mut done = false;
    while !done {
        if array_check(&array, row) {
            if row == N - 1 {
                found += 1;
            } else {
                row += 1;
                array[row as usize] = 0;
                continue;
            }
        }
        array[row as usize] += 1;
        while array[row as usize] >= N {
            row -= 1;
            if row >= 0 {
                array[row as usize] += 1;
            } else {
                done = true;
                break;
            }
        }
    }
    found
}

fn main() {
    queen();
    let ts = clock_realtime();
    let found = queen();
    let dt = clock_realtime() - ts;
    println!("found={} time={} ms", found, dt);
}
```

我们需要查看汇编，看看 `panic` 相关的汇编是不是变少

### 从汇编角度分析

在 Rust 1.88 得到的涉及到边界检查的汇编如下

```asm
.LBB6_40:
	leaq	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.7(%rip), %rdx
	movl	$13, %esi
	callq	*_ZN4core9panicking18panic_bounds_check17hda0827d94e974e71E@GOTPCREL(%rip)
```

在 Rust 1.42 得到的涉及到边界检查的汇编如下

```asm
.LBB4_19:
	.cfi_def_cfa_offset 64
	leaq	.L__unnamed_2(%rip), %rdi
	movl	$13, %esi
	movl	$13, %edx
	callq	*_ZN4core9panicking18panic_bounds_check17h09b793daa6d169ffE@GOTPCREL(%rip)
	ud2
.LBB4_25:
	leaq	.L__unnamed_3(%rip), %rdi
	movl	$13, %edx
	callq	*_ZN4core9panicking18panic_bounds_check17h09b793daa6d169ffE@GOTPCREL(%rip)
	ud2
.LBB4_17:
	leaq	.L__unnamed_4(%rip), %rdi
	movl	$13, %edx
	callq	*_ZN4core9panicking18panic_bounds_check17h09b793daa6d169ffE@GOTPCREL(%rip)
	ud2
.LBB4_15:
	leaq	.L__unnamed_5(%rip), %rdi
	movl	$13, %edx
	callq	*_ZN4core9panicking18panic_bounds_check17h09b793daa6d169ffE@GOTPCREL(%rip)
	ud2
.LBB4_9:
	leaq	.L__unnamed_6(%rip), %rdi
	movl	$13, %edx
	callq	*_ZN4core9panicking18panic_bounds_check17h09b793daa6d169ffE@GOTPCREL(%rip)
	ud2
```

可以看到很明显是从五个减少到了一个，说明 Rust 本身也在不断进步

### 附录

1.完整的 Rust `1.88.0` 输出汇编

```asm
	.file	"boundtest.375cfcca86286996-cgu.0"
	.section	.text._ZN3std2rt10lang_start17h3c102020d822bd07E,"ax",@progbits
	.hidden	_ZN3std2rt10lang_start17h3c102020d822bd07E
	.globl	_ZN3std2rt10lang_start17h3c102020d822bd07E
	.p2align	4
	.type	_ZN3std2rt10lang_start17h3c102020d822bd07E,@function
_ZN3std2rt10lang_start17h3c102020d822bd07E:
	.cfi_startproc
	pushq	%rax
	.cfi_def_cfa_offset 16
	movl	%ecx, %r8d
	movq	%rdx, %rcx
	movq	%rsi, %rdx
	movq	%rdi, (%rsp)
	leaq	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.0(%rip), %rsi
	movq	%rsp, %rdi
	callq	*_ZN3std2rt19lang_start_internal17ha8ef919ae4984948E@GOTPCREL(%rip)
	popq	%rcx
	.cfi_def_cfa_offset 8
	retq
.Lfunc_end0:
	.size	_ZN3std2rt10lang_start17h3c102020d822bd07E, .Lfunc_end0-_ZN3std2rt10lang_start17h3c102020d822bd07E
	.cfi_endproc

	.section	".text._ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17h93d859901d9a3bf1E","ax",@progbits
	.p2align	4
	.type	_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17h93d859901d9a3bf1E,@function
_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17h93d859901d9a3bf1E:
	.cfi_startproc
	pushq	%rax
	.cfi_def_cfa_offset 16
	movq	(%rdi), %rdi
	callq	_ZN3std3sys9backtrace28__rust_begin_short_backtrace17h8132116926a6755eE
	xorl	%eax, %eax
	popq	%rcx
	.cfi_def_cfa_offset 8
	retq
.Lfunc_end1:
	.size	_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17h93d859901d9a3bf1E, .Lfunc_end1-_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17h93d859901d9a3bf1E
	.cfi_endproc

	.section	.text._ZN3std3sys9backtrace28__rust_begin_short_backtrace17h8132116926a6755eE,"ax",@progbits
	.p2align	4
	.type	_ZN3std3sys9backtrace28__rust_begin_short_backtrace17h8132116926a6755eE,@function
_ZN3std3sys9backtrace28__rust_begin_short_backtrace17h8132116926a6755eE:
	.cfi_startproc
	pushq	%rax
	.cfi_def_cfa_offset 16
	callq	*%rdi
	#APP
	#NO_APP
	popq	%rax
	.cfi_def_cfa_offset 8
	retq
.Lfunc_end2:
	.size	_ZN3std3sys9backtrace28__rust_begin_short_backtrace17h8132116926a6755eE, .Lfunc_end2-_ZN3std3sys9backtrace28__rust_begin_short_backtrace17h8132116926a6755eE
	.cfi_endproc

	.section	".text._ZN42_$LT$$RF$T$u20$as$u20$core..fmt..Debug$GT$3fmt17haf17d8060b4e03d4E","ax",@progbits
	.p2align	4
	.type	_ZN42_$LT$$RF$T$u20$as$u20$core..fmt..Debug$GT$3fmt17haf17d8060b4e03d4E,@function
_ZN42_$LT$$RF$T$u20$as$u20$core..fmt..Debug$GT$3fmt17haf17d8060b4e03d4E:
	.cfi_startproc
	movq	(%rdi), %rdi
	jmpq	*_ZN57_$LT$core..time..Duration$u20$as$u20$core..fmt..Debug$GT$3fmt17h7281b74b0c14c846E@GOTPCREL(%rip)
.Lfunc_end3:
	.size	_ZN42_$LT$$RF$T$u20$as$u20$core..fmt..Debug$GT$3fmt17haf17d8060b4e03d4E, .Lfunc_end3-_ZN42_$LT$$RF$T$u20$as$u20$core..fmt..Debug$GT$3fmt17haf17d8060b4e03d4E
	.cfi_endproc

	.section	".text._ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17hfb43ae5ef4974b72E","ax",@progbits
	.p2align	4
	.type	_ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17hfb43ae5ef4974b72E,@function
_ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17hfb43ae5ef4974b72E:
	.cfi_startproc
	pushq	%rax
	.cfi_def_cfa_offset 16
	movq	(%rdi), %rdi
	callq	_ZN3std3sys9backtrace28__rust_begin_short_backtrace17h8132116926a6755eE
	xorl	%eax, %eax
	popq	%rcx
	.cfi_def_cfa_offset 8
	retq
.Lfunc_end4:
	.size	_ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17hfb43ae5ef4974b72E, .Lfunc_end4-_ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17hfb43ae5ef4974b72E
	.cfi_endproc

	.section	".text._ZN63_$LT$std..time..SystemTimeError$u20$as$u20$core..fmt..Debug$GT$3fmt17hdc81834098293439E","ax",@progbits
	.p2align	4
	.type	_ZN63_$LT$std..time..SystemTimeError$u20$as$u20$core..fmt..Debug$GT$3fmt17hdc81834098293439E,@function
_ZN63_$LT$std..time..SystemTimeError$u20$as$u20$core..fmt..Debug$GT$3fmt17hdc81834098293439E:
	.cfi_startproc
	pushq	%rax
	.cfi_def_cfa_offset 16
	movq	%rsi, %rax
	movq	%rdi, (%rsp)
	leaq	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.3(%rip), %rsi
	leaq	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.2(%rip), %r8
	movq	%rsp, %rcx
	movl	$15, %edx
	movq	%rax, %rdi
	callq	*_ZN4core3fmt9Formatter25debug_tuple_field1_finish17h06aa1c014801bdacE@GOTPCREL(%rip)
	popq	%rcx
	.cfi_def_cfa_offset 8
	retq
.Lfunc_end5:
	.size	_ZN63_$LT$std..time..SystemTimeError$u20$as$u20$core..fmt..Debug$GT$3fmt17hdc81834098293439E, .Lfunc_end5-_ZN63_$LT$std..time..SystemTimeError$u20$as$u20$core..fmt..Debug$GT$3fmt17hdc81834098293439E
	.cfi_endproc

	.section	.text._ZN9boundtest4main17ha95ec5995628f7dfE,"ax",@progbits
	.p2align	4
	.type	_ZN9boundtest4main17ha95ec5995628f7dfE,@function
_ZN9boundtest4main17ha95ec5995628f7dfE:
	.cfi_startproc
	pushq	%rbp
	.cfi_def_cfa_offset 16
	pushq	%r14
	.cfi_def_cfa_offset 24
	pushq	%rbx
	.cfi_def_cfa_offset 32
	subq	$112, %rsp
	.cfi_def_cfa_offset 144
	.cfi_offset %rbx, -32
	.cfi_offset %r14, -24
	.cfi_offset %rbp, -16
	xorps	%xmm0, %xmm0
	movaps	%xmm0, 32(%rsp)
	movaps	%xmm0, 16(%rsp)
	movaps	%xmm0, (%rsp)
	movl	$0, 48(%rsp)
	xorl	%edx, %edx
	movq	%rsp, %rax
	jmp	.LBB6_1
	.p2align	4
.LBB6_3:
	movl	$1, %edx
	movl	$1, %ecx
	movl	$0, (%rsp,%rcx,4)
.LBB6_1:
	movslq	%edx, %rdi
	movl	%edi, %ecx
	jmp	.LBB6_2
	.p2align	4
.LBB6_10:
	incl	%esi
	movl	%esi, (%rsp,%rcx,4)
	cmpl	$13, %esi
	jge	.LBB6_14
.LBB6_2:
	testl	%edx, %edx
	je	.LBB6_3
	cmpl	$12, %ecx
	ja	.LBB6_40
	movl	(%rsp,%rdi,4), %esi
	movq	%rax, %r8
	movq	%rcx, %r10
	movq	%rcx, %r9
	.p2align	4
.LBB6_6:
	subq	$1, %r9
	jb	.LBB6_11
	movl	(%r8), %r11d
	movl	%r11d, %ebx
	subl	%esi, %ebx
	je	.LBB6_10
	cmpl	%ebx, %r10d
	je	.LBB6_10
	movl	%esi, %ebx
	subl	%r11d, %ebx
	addq	$4, %r8
	cmpl	%ebx, %r10d
	movq	%r9, %r10
	jne	.LBB6_6
	jmp	.LBB6_10
	.p2align	4
.LBB6_11:
	cmpl	$12, %edx
	jne	.LBB6_17
	incl	48(%rsp)
	movl	(%rsp,%rcx,4), %esi
	cmpl	$13, %esi
	jl	.LBB6_2
	.p2align	4
.LBB6_14:
	subq	$1, %rcx
	jb	.LBB6_19
	movl	(%rsp,%rcx,4), %edx
	incl	%edx
	movl	%edx, (%rsp,%rcx,4)
	cmpl	$12, %edx
	jg	.LBB6_14
	movl	%ecx, %edx
	jmp	.LBB6_1
.LBB6_17:
	incl	%ecx
	movl	%ecx, %edx
	movl	$0, (%rsp,%rcx,4)
	jmp	.LBB6_1
.LBB6_19:
	callq	*_ZN3std4time10SystemTime3now17h1481857dbd8e3482E@GOTPCREL(%rip)
	movq	%rax, 64(%rsp)
	movl	%edx, 72(%rsp)
	xorl	%ebx, %ebx
	movq	%rsp, %rdi
	leaq	64(%rsp), %rsi
	xorl	%edx, %edx
	xorl	%ecx, %ecx
	callq	*_ZN3std4time10SystemTime14duration_since17hf6dc8eb19471745bE@GOTPCREL(%rip)
	cmpl	$1, (%rsp)
	je	.LBB6_39
	movq	8(%rsp), %r14
	movl	16(%rsp), %ebp
	xorps	%xmm0, %xmm0
	movaps	%xmm0, 32(%rsp)
	movaps	%xmm0, 16(%rsp)
	movaps	%xmm0, (%rsp)
	movl	$0, 48(%rsp)
	xorl	%eax, %eax
	jmp	.LBB6_21
	.p2align	4
.LBB6_22:
	movl	$1, %ecx
.LBB6_37:
	movl	$0, (%rsp,%rcx,4)
	incl	%eax
.LBB6_21:
	testl	%eax, %eax
	je	.LBB6_22
	movslq	%eax, %rdi
	cmpl	$12, %eax
	ja	.LBB6_40
	movl	%edi, %ecx
	movl	(%rsp,%rdi,4), %edx
	movl	%eax, %edi
	xorl	%esi, %esi
	.p2align	4
.LBB6_25:
	cmpq	%rsi, %rcx
	je	.LBB6_30
	movl	(%rsp,%rsi,4), %r8d
	movl	%r8d, %r9d
	subl	%edx, %r9d
	je	.LBB6_29
	cmpl	%r9d, %edi
	je	.LBB6_29
	incq	%rsi
	movl	%edx, %r9d
	subl	%r8d, %r9d
	leal	-1(%rdi), %r8d
	cmpl	%r9d, %edi
	movl	%r8d, %edi
	jne	.LBB6_25
.LBB6_29:
	incl	%edx
	movl	%edx, (%rsp,%rcx,4)
	cmpl	$13, %edx
	jl	.LBB6_21
	.p2align	4
.LBB6_33:
	subq	$1, %rcx
	jb	.LBB6_38
	movl	(%rsp,%rcx,4), %eax
	incl	%eax
	movl	%eax, (%rsp,%rcx,4)
	cmpl	$12, %eax
	jg	.LBB6_33
	movl	%ecx, %eax
	jmp	.LBB6_21
	.p2align	4
.LBB6_30:
	cmpl	$12, %eax
	je	.LBB6_31
	leal	1(%rax), %ecx
	jmp	.LBB6_37
.LBB6_31:
	incl	%ebx
	incl	48(%rsp)
	movl	(%rsp,%rcx,4), %edx
	cmpl	$13, %edx
	jl	.LBB6_21
	jmp	.LBB6_33
.LBB6_38:
	movl	%ebx, 60(%rsp)
	callq	*_ZN3std4time10SystemTime3now17h1481857dbd8e3482E@GOTPCREL(%rip)
	movq	%rax, 64(%rsp)
	movl	%edx, 72(%rsp)
	movq	%rsp, %rdi
	leaq	64(%rsp), %rbx
	movq	%rbx, %rsi
	xorl	%edx, %edx
	xorl	%ecx, %ecx
	callq	*_ZN3std4time10SystemTime14duration_since17hf6dc8eb19471745bE@GOTPCREL(%rip)
	cmpl	$1, (%rsp)
	je	.LBB6_39
	movl	%ebp, %eax
	imulq	$1125899907, %rax, %rax
	shrq	$50, %rax
	movq	8(%rsp), %rcx
	subq	%r14, %rcx
	movl	16(%rsp), %edx
	imulq	$1125899907, %rdx, %rdx
	shrq	$50, %rdx
	subq	%rax, %rdx
	imulq	$1000, %rcx, %rax
	addq	%rdx, %rax
	movq	%rax, 64(%rsp)
	leaq	60(%rsp), %rax
	movq	%rax, 80(%rsp)
	movq	_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$i32$GT$3fmt17h863d77ac4b43588eE@GOTPCREL(%rip), %rax
	movq	%rax, 88(%rsp)
	movq	%rbx, 96(%rsp)
	movq	_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$i64$GT$3fmt17hde631ae64c57a835E@GOTPCREL(%rip), %rax
	movq	%rax, 104(%rsp)
	leaq	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.11(%rip), %rax
	movq	%rax, (%rsp)
	movq	$3, 8(%rsp)
	movq	$0, 32(%rsp)
	leaq	80(%rsp), %rax
	movq	%rax, 16(%rsp)
	movq	$2, 24(%rsp)
	movq	%rsp, %rdi
	callq	*_ZN3std2io5stdio6_print17h915f3273edec6464E@GOTPCREL(%rip)
	addq	$112, %rsp
	.cfi_def_cfa_offset 32
	popq	%rbx
	.cfi_def_cfa_offset 24
	popq	%r14
	.cfi_def_cfa_offset 16
	popq	%rbp
	.cfi_def_cfa_offset 8
	retq
.LBB6_39:
	.cfi_def_cfa_offset 144
	movq	8(%rsp), %rax
	movl	16(%rsp), %ecx
	movq	%rax, 80(%rsp)
	movl	%ecx, 88(%rsp)
	leaq	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.4(%rip), %rdi
	leaq	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.1(%rip), %rcx
	leaq	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.6(%rip), %r8
	leaq	80(%rsp), %rdx
	movl	$19, %esi
	callq	*_ZN4core6result13unwrap_failed17h727108008d9f4c9bE@GOTPCREL(%rip)
.LBB6_40:
	leaq	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.7(%rip), %rdx
	movl	$13, %esi
	callq	*_ZN4core9panicking18panic_bounds_check17hda0827d94e974e71E@GOTPCREL(%rip)
.Lfunc_end6:
	.size	_ZN9boundtest4main17ha95ec5995628f7dfE, .Lfunc_end6-_ZN9boundtest4main17ha95ec5995628f7dfE
	.cfi_endproc

	.section	.text.main,"ax",@progbits
	.globl	main
	.p2align	4
	.type	main,@function
main:
	.cfi_startproc
	pushq	%rax
	.cfi_def_cfa_offset 16
	movq	%rsi, %rcx
	movslq	%edi, %rdx
	leaq	_ZN9boundtest4main17ha95ec5995628f7dfE(%rip), %rax
	movq	%rax, (%rsp)
	leaq	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.0(%rip), %rsi
	movq	%rsp, %rdi
	xorl	%r8d, %r8d
	callq	*_ZN3std2rt19lang_start_internal17ha8ef919ae4984948E@GOTPCREL(%rip)
	popq	%rcx
	.cfi_def_cfa_offset 8
	retq
.Lfunc_end7:
	.size	main, .Lfunc_end7-main
	.cfi_endproc

	.type	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.0,@object
	.section	.data.rel.ro..Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.0,"aw",@progbits
	.p2align	3, 0x0
.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.0:
	.asciz	"\000\000\000\000\000\000\000\000\b\000\000\000\000\000\000\000\b\000\000\000\000\000\000"
	.quad	_ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17hfb43ae5ef4974b72E
	.quad	_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17h93d859901d9a3bf1E
	.quad	_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17h93d859901d9a3bf1E
	.size	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.0, 48

	.type	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.1,@object
	.section	.data.rel.ro..Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.1,"aw",@progbits
	.p2align	3, 0x0
.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.1:
	.asciz	"\000\000\000\000\000\000\000\000\020\000\000\000\000\000\000\000\b\000\000\000\000\000\000"
	.quad	_ZN63_$LT$std..time..SystemTimeError$u20$as$u20$core..fmt..Debug$GT$3fmt17hdc81834098293439E
	.size	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.1, 32

	.type	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.2,@object
	.section	.data.rel.ro..Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.2,"aw",@progbits
	.p2align	3, 0x0
.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.2:
	.asciz	"\000\000\000\000\000\000\000\000\b\000\000\000\000\000\000\000\b\000\000\000\000\000\000"
	.quad	_ZN42_$LT$$RF$T$u20$as$u20$core..fmt..Debug$GT$3fmt17haf17d8060b4e03d4E
	.size	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.2, 32

	.type	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.3,@object
	.section	.rodata..Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.3,"a",@progbits
.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.3:
	.ascii	"SystemTimeError"
	.size	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.3, 15

	.type	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.4,@object
	.section	.rodata..Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.4,"a",@progbits
.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.4:
	.ascii	"Time went backwards"
	.size	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.4, 19

	.type	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.5,@object
	.section	.rodata..Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.5,"a",@progbits
.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.5:
	.ascii	"src/main.rs"
	.size	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.5, 11

	.type	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.6,@object
	.section	.data.rel.ro..Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.6,"aw",@progbits
	.p2align	3, 0x0
.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.6:
	.quad	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.5
	.asciz	"\013\000\000\000\000\000\000\000\t\000\000\000\n\000\000"
	.size	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.6, 24

	.type	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.7,@object
	.section	.data.rel.ro..Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.7,"aw",@progbits
	.p2align	3, 0x0
.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.7:
	.quad	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.5
	.asciz	"\013\000\000\000\000\000\000\000\021\000\000\000\022\000\000"
	.size	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.7, 24

	.type	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.8,@object
	.section	.rodata..Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.8,"a",@progbits
.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.8:
	.ascii	"found="
	.size	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.8, 6

	.type	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.9,@object
	.section	.rodata..Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.9,"a",@progbits
.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.9:
	.ascii	" time="
	.size	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.9, 6

	.type	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.10,@object
	.section	.rodata.cst4,"aM",@progbits,4
.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.10:
	.ascii	" ms\n"
	.size	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.10, 4

	.type	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.11,@object
	.section	.data.rel.ro..Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.11,"aw",@progbits
	.p2align	3, 0x0
.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.11:
	.quad	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.8
	.asciz	"\006\000\000\000\000\000\000"
	.quad	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.9
	.asciz	"\006\000\000\000\000\000\000"
	.quad	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.10
	.asciz	"\004\000\000\000\000\000\000"
	.size	.Lanon.577bbe129332a5e2b73bb2ccd2cfb5e2.11, 48

	.ident	"rustc version 1.88.0 (6b00bc388 2025-06-23)"
	.section	".note.GNU-stack","",@progbits
```

2.完整的 Rust `1.42.0` 输出汇编

```asm
	.text
	.file	"boundtest.6clktnjp-cgu.0"
	.section	.text._ZN3std2rt10lang_start17h9aebbcf43540bf0fE,"ax",@progbits
	.hidden	_ZN3std2rt10lang_start17h9aebbcf43540bf0fE
	.globl	_ZN3std2rt10lang_start17h9aebbcf43540bf0fE
	.p2align	4, 0x90
	.type	_ZN3std2rt10lang_start17h9aebbcf43540bf0fE,@function
_ZN3std2rt10lang_start17h9aebbcf43540bf0fE:
	.cfi_startproc
	pushq	%rax
	.cfi_def_cfa_offset 16
	movq	%rdx, %rcx
	movq	%rsi, %rdx
	movq	%rdi, (%rsp)
	leaq	.L__unnamed_1(%rip), %rsi
	movq	%rsp, %rdi
	callq	*_ZN3std2rt19lang_start_internal17h9cf8802361ad86c2E@GOTPCREL(%rip)
	popq	%rcx
	.cfi_def_cfa_offset 8
	retq
.Lfunc_end0:
	.size	_ZN3std2rt10lang_start17h9aebbcf43540bf0fE, .Lfunc_end0-_ZN3std2rt10lang_start17h9aebbcf43540bf0fE
	.cfi_endproc

	.section	".text._ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17hfcc61cdeabb58ae0E","ax",@progbits
	.p2align	4, 0x90
	.type	_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17hfcc61cdeabb58ae0E,@function
_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17hfcc61cdeabb58ae0E:
	.cfi_startproc
	pushq	%rax
	.cfi_def_cfa_offset 16
	callq	*(%rdi)
	xorl	%eax, %eax
	popq	%rcx
	.cfi_def_cfa_offset 8
	retq
.Lfunc_end1:
	.size	_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17hfcc61cdeabb58ae0E, .Lfunc_end1-_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17hfcc61cdeabb58ae0E
	.cfi_endproc

	.section	".text._ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17h85cd4d27ce61189fE","ax",@progbits
	.p2align	4, 0x90
	.type	_ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17h85cd4d27ce61189fE,@function
_ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17h85cd4d27ce61189fE:
	.cfi_startproc
	pushq	%rax
	.cfi_def_cfa_offset 16
	callq	*(%rdi)
	xorl	%eax, %eax
	popq	%rcx
	.cfi_def_cfa_offset 8
	retq
.Lfunc_end2:
	.size	_ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17h85cd4d27ce61189fE, .Lfunc_end2-_ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17h85cd4d27ce61189fE
	.cfi_endproc

	.section	.text._ZN4core3ptr13drop_in_place17h8206b4e5dd5bef15E,"ax",@progbits
	.p2align	4, 0x90
	.type	_ZN4core3ptr13drop_in_place17h8206b4e5dd5bef15E,@function
_ZN4core3ptr13drop_in_place17h8206b4e5dd5bef15E:
	.cfi_startproc
	retq
.Lfunc_end3:
	.size	_ZN4core3ptr13drop_in_place17h8206b4e5dd5bef15E, .Lfunc_end3-_ZN4core3ptr13drop_in_place17h8206b4e5dd5bef15E
	.cfi_endproc

	.section	.text._ZN9boundtest5queen17h2a40cedb5ec97973E,"ax",@progbits
	.p2align	4, 0x90
	.type	_ZN9boundtest5queen17h2a40cedb5ec97973E,@function
_ZN9boundtest5queen17h2a40cedb5ec97973E:
	.cfi_startproc
	subq	$56, %rsp
	.cfi_def_cfa_offset 64
	xorps	%xmm0, %xmm0
	movaps	%xmm0, 32(%rsp)
	movaps	%xmm0, 16(%rsp)
	movaps	%xmm0, (%rsp)
	movl	$0, 48(%rsp)
	xorl	%eax, %eax
	xorl	%r8d, %r8d
	testl	%r8d, %r8d
	jne	.LBB4_4
	.p2align	4, 0x90
.LBB4_2:
	movl	$1, %r8d
	movl	$1, %esi
.LBB4_3:
	movl	$0, (%rsp,%rsi,4)
.LBB4_1:
	testl	%r8d, %r8d
	je	.LBB4_2
.LBB4_4:
	movslq	%r8d, %rsi
	cmpl	$12, %r8d
	ja	.LBB4_17
	movl	(%rsp,%rsi,4), %r9d
	movl	%r8d, %r10d
	xorl	%edi, %edi
	.p2align	4, 0x90
.LBB4_6:
	cmpq	%rsi, %rdi
	jge	.LBB4_7
	cmpq	$13, %rdi
	je	.LBB4_19
	movl	(%rsp,%rdi,4), %ecx
	movl	%ecx, %edx
	subl	%r9d, %edx
	je	.LBB4_14
	cmpl	%edx, %r10d
	je	.LBB4_14
	addq	$1, %rdi
	movl	%r9d, %edx
	subl	%ecx, %edx
	leal	-1(%r10), %ecx
	cmpl	%edx, %r10d
	movl	%ecx, %r10d
	jne	.LBB4_6
.LBB4_14:
	movq	%rsi, %rcx
	cmpl	$12, %r8d
	ja	.LBB4_15
	addl	$1, (%rsp,%rcx,4)
	cmpl	$13, (%rsp,%rsi,4)
	jl	.LBB4_1
	.p2align	4, 0x90
.LBB4_22:
	addl	$-1, %r8d
	js	.LBB4_16
	movslq	%r8d, %rsi
	cmpl	$12, %esi
	ja	.LBB4_25
	movl	(%rsp,%rsi,4), %ecx
	addl	$1, %ecx
	movl	%ecx, (%rsp,%rsi,4)
	cmpl	$12, %ecx
	jg	.LBB4_22
	jmp	.LBB4_1
	.p2align	4, 0x90
.LBB4_7:
	cmpl	$12, %r8d
	je	.LBB4_20
	addl	$1, %r8d
	movslq	%r8d, %rsi
	cmpl	$13, %esi
	jb	.LBB4_3
	jmp	.LBB4_9
.LBB4_20:
	addl	$1, %eax
	movl	$12, %ecx
	addl	$1, (%rsp,%rcx,4)
	cmpl	$13, (%rsp,%rsi,4)
	jl	.LBB4_1
	jmp	.LBB4_22
.LBB4_16:
	addq	$56, %rsp
	.cfi_def_cfa_offset 8
	retq
.LBB4_19:
	.cfi_def_cfa_offset 64
	leaq	.L__unnamed_2(%rip), %rdi
	movl	$13, %esi
	movl	$13, %edx
	callq	*_ZN4core9panicking18panic_bounds_check17h09b793daa6d169ffE@GOTPCREL(%rip)
	ud2
.LBB4_25:
	leaq	.L__unnamed_3(%rip), %rdi
	movl	$13, %edx
	callq	*_ZN4core9panicking18panic_bounds_check17h09b793daa6d169ffE@GOTPCREL(%rip)
	ud2
.LBB4_17:
	leaq	.L__unnamed_4(%rip), %rdi
	movl	$13, %edx
	callq	*_ZN4core9panicking18panic_bounds_check17h09b793daa6d169ffE@GOTPCREL(%rip)
	ud2
.LBB4_15:
	leaq	.L__unnamed_5(%rip), %rdi
	movl	$13, %edx
	callq	*_ZN4core9panicking18panic_bounds_check17h09b793daa6d169ffE@GOTPCREL(%rip)
	ud2
.LBB4_9:
	leaq	.L__unnamed_6(%rip), %rdi
	movl	$13, %edx
	callq	*_ZN4core9panicking18panic_bounds_check17h09b793daa6d169ffE@GOTPCREL(%rip)
	ud2
.Lfunc_end4:
	.size	_ZN9boundtest5queen17h2a40cedb5ec97973E, .Lfunc_end4-_ZN9boundtest5queen17h2a40cedb5ec97973E
	.cfi_endproc

	.section	.text._ZN9boundtest4main17h261b80ccf5b33e42E,"ax",@progbits
	.p2align	4, 0x90
	.type	_ZN9boundtest4main17h261b80ccf5b33e42E,@function
_ZN9boundtest4main17h261b80ccf5b33e42E:
	.cfi_startproc
	pushq	%rbp
	.cfi_def_cfa_offset 16
	pushq	%r14
	.cfi_def_cfa_offset 24
	pushq	%rbx
	.cfi_def_cfa_offset 32
	subq	$112, %rsp
	.cfi_def_cfa_offset 144
	.cfi_offset %rbx, -32
	.cfi_offset %r14, -24
	.cfi_offset %rbp, -16
	callq	_ZN9boundtest5queen17h2a40cedb5ec97973E
	callq	*_ZN3std4time10SystemTime3now17hb1b51de2cdb13891E@GOTPCREL(%rip)
	movq	%rax, 16(%rsp)
	movq	%rdx, 24(%rsp)
	leaq	32(%rsp), %rdi
	leaq	16(%rsp), %rsi
	xorl	%edx, %edx
	xorl	%ecx, %ecx
	callq	*_ZN3std4time10SystemTime14duration_since17he01043b61d61d851E@GOTPCREL(%rip)
	cmpq	$1, 32(%rsp)
	je	.LBB5_3
	movq	40(%rsp), %rbx
	movl	48(%rsp), %ebp
	callq	_ZN9boundtest5queen17h2a40cedb5ec97973E
	movl	%eax, 12(%rsp)
	callq	*_ZN3std4time10SystemTime3now17hb1b51de2cdb13891E@GOTPCREL(%rip)
	movq	%rax, 16(%rsp)
	movq	%rdx, 24(%rsp)
	leaq	32(%rsp), %rdi
	leaq	16(%rsp), %r14
	movq	%r14, %rsi
	xorl	%edx, %edx
	xorl	%ecx, %ecx
	callq	*_ZN3std4time10SystemTime14duration_since17he01043b61d61d851E@GOTPCREL(%rip)
	cmpq	$1, 32(%rsp)
	je	.LBB5_3
	movl	%ebp, %eax
	imulq	$1125899907, %rax, %rax
	shrq	$50, %rax
	movq	40(%rsp), %rcx
	subq	%rbx, %rcx
	movl	48(%rsp), %edx
	imulq	$1125899907, %rdx, %rdx
	shrq	$50, %rdx
	subq	%rax, %rdx
	imulq	$1000, %rcx, %rax
	addq	%rdx, %rax
	movq	%rax, 16(%rsp)
	leaq	12(%rsp), %rax
	movq	%rax, 80(%rsp)
	movq	_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$i32$GT$3fmt17h765415089818841eE@GOTPCREL(%rip), %rax
	movq	%rax, 88(%rsp)
	movq	%r14, 96(%rsp)
	movq	_ZN4core3fmt3num3imp52_$LT$impl$u20$core..fmt..Display$u20$for$u20$i64$GT$3fmt17h6c2dbda1d476d957E@GOTPCREL(%rip), %rax
	movq	%rax, 104(%rsp)
	leaq	.L__unnamed_7(%rip), %rax
	movq	%rax, 32(%rsp)
	movq	$3, 40(%rsp)
	movq	$0, 48(%rsp)
	leaq	80(%rsp), %rax
	movq	%rax, 64(%rsp)
	movq	$2, 72(%rsp)
	leaq	32(%rsp), %rdi
	callq	*_ZN3std2io5stdio6_print17h7e1d4022dd9ebaeaE@GOTPCREL(%rip)
	addq	$112, %rsp
	.cfi_def_cfa_offset 32
	popq	%rbx
	.cfi_def_cfa_offset 24
	popq	%r14
	.cfi_def_cfa_offset 16
	popq	%rbp
	.cfi_def_cfa_offset 8
	retq
.LBB5_3:
	.cfi_def_cfa_offset 144
	movq	40(%rsp), %rax
	movl	48(%rsp), %ecx
	movq	%rax, 80(%rsp)
	movl	%ecx, 88(%rsp)
	leaq	.L__unnamed_8(%rip), %rdi
	leaq	.L__unnamed_9(%rip), %rcx
	leaq	.L__unnamed_10(%rip), %r8
	leaq	80(%rsp), %rdx
	movl	$19, %esi
	callq	*_ZN4core6result13unwrap_failed17h44d0943ece29c280E@GOTPCREL(%rip)
	ud2
.Lfunc_end5:
	.size	_ZN9boundtest4main17h261b80ccf5b33e42E, .Lfunc_end5-_ZN9boundtest4main17h261b80ccf5b33e42E
	.cfi_endproc

	.section	.text.main,"ax",@progbits
	.globl	main
	.p2align	4, 0x90
	.type	main,@function
main:
	.cfi_startproc
	pushq	%rax
	.cfi_def_cfa_offset 16
	movq	%rsi, %rcx
	movslq	%edi, %rdx
	leaq	_ZN9boundtest4main17h261b80ccf5b33e42E(%rip), %rax
	movq	%rax, (%rsp)
	leaq	.L__unnamed_1(%rip), %rsi
	movq	%rsp, %rdi
	callq	*_ZN3std2rt19lang_start_internal17h9cf8802361ad86c2E@GOTPCREL(%rip)
	popq	%rcx
	.cfi_def_cfa_offset 8
	retq
.Lfunc_end6:
	.size	main, .Lfunc_end6-main
	.cfi_endproc

	.type	.L__unnamed_1,@object
	.section	.data.rel.ro..L__unnamed_1,"aw",@progbits
	.p2align	3
.L__unnamed_1:
	.quad	_ZN4core3ptr13drop_in_place17h8206b4e5dd5bef15E
	.quad	8
	.quad	8
	.quad	_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17hfcc61cdeabb58ae0E
	.quad	_ZN3std2rt10lang_start28_$u7b$$u7b$closure$u7d$$u7d$17hfcc61cdeabb58ae0E
	.quad	_ZN4core3ops8function6FnOnce40call_once$u7b$$u7b$vtable.shim$u7d$$u7d$17h85cd4d27ce61189fE
	.size	.L__unnamed_1, 48

	.type	.L__unnamed_9,@object
	.section	.data.rel.ro..L__unnamed_9,"aw",@progbits
	.p2align	3
.L__unnamed_9:
	.quad	_ZN4core3ptr13drop_in_place17h8206b4e5dd5bef15E
	.quad	16
	.quad	8
	.quad	_ZN63_$LT$std..time..SystemTimeError$u20$as$u20$core..fmt..Debug$GT$3fmt17hc5da7e82d27f47abE
	.size	.L__unnamed_9, 32

	.type	.L__unnamed_8,@object
	.section	.rodata..L__unnamed_8,"a",@progbits
.L__unnamed_8:
	.ascii	"Time went backwards"
	.size	.L__unnamed_8, 19

	.type	.L__unnamed_11,@object
	.section	.rodata..L__unnamed_11,"a",@progbits
.L__unnamed_11:
	.ascii	"src/main.rs"
	.size	.L__unnamed_11, 11

	.type	.L__unnamed_10,@object
	.section	.data.rel.ro..L__unnamed_10,"aw",@progbits
	.p2align	3
.L__unnamed_10:
	.quad	.L__unnamed_11
	.asciz	"\013\000\000\000\000\000\000\000\007\000\000\000\033\000\000"
	.size	.L__unnamed_10, 24

	.type	.L__unnamed_4,@object
	.section	.data.rel.ro..L__unnamed_4,"aw",@progbits
	.p2align	3
.L__unnamed_4:
	.quad	.L__unnamed_11
	.asciz	"\013\000\000\000\000\000\000\000\021\000\000\000\022\000\000"
	.size	.L__unnamed_4, 24

	.type	.L__unnamed_2,@object
	.section	.data.rel.ro..L__unnamed_2,"aw",@progbits
	.p2align	3
.L__unnamed_2:
	.quad	.L__unnamed_11
	.asciz	"\013\000\000\000\000\000\000\000\023\000\000\000\025\000\000"
	.size	.L__unnamed_2, 24

	.type	.L__unnamed_6,@object
	.section	.data.rel.ro..L__unnamed_6,"aw",@progbits
	.p2align	3
.L__unnamed_6:
	.quad	.L__unnamed_11
	.asciz	"\013\000\000\000\000\000\000\000+\000\000\000\021\000\000"
	.size	.L__unnamed_6, 24

	.type	.L__unnamed_5,@object
	.section	.data.rel.ro..L__unnamed_5,"aw",@progbits
	.p2align	3
.L__unnamed_5:
	.quad	.L__unnamed_11
	.asciz	"\013\000\000\000\000\000\000\000/\000\000\000\t\000\000"
	.size	.L__unnamed_5, 24

	.type	.L__unnamed_3,@object
	.section	.data.rel.ro..L__unnamed_3,"aw",@progbits
	.p2align	3
.L__unnamed_3:
	.quad	.L__unnamed_11
	.asciz	"\013\000\000\000\000\000\000\0003\000\000\000\021\000\000"
	.size	.L__unnamed_3, 24

	.type	.L__unnamed_12,@object
	.section	.rodata..L__unnamed_12,"a",@progbits
.L__unnamed_12:
	.ascii	"found="
	.size	.L__unnamed_12, 6

	.type	.L__unnamed_13,@object
	.section	.rodata..L__unnamed_13,"a",@progbits
.L__unnamed_13:
	.ascii	" time="
	.size	.L__unnamed_13, 6

	.type	.L__unnamed_14,@object
	.section	.rodata.cst4,"aM",@progbits,4
.L__unnamed_14:
	.ascii	" ms\n"
	.size	.L__unnamed_14, 4

	.type	.L__unnamed_7,@object
	.section	.data.rel.ro..L__unnamed_7,"aw",@progbits
	.p2align	3
.L__unnamed_7:
	.quad	.L__unnamed_12
	.asciz	"\006\000\000\000\000\000\000"
	.quad	.L__unnamed_13
	.asciz	"\006\000\000\000\000\000\000"
	.quad	.L__unnamed_14
	.asciz	"\004\000\000\000\000\000\000"
	.size	.L__unnamed_7, 48


	.section	".note.GNU-stack","",@progbits
```
