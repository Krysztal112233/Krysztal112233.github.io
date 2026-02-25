---
title: 令 acme.sh 使用 Cloudflare 的 DNS API 签发与续签证书
date: 2026-02-25 22:46:18
tags:
    - 技术
    - 捣鼓
---

使用 `acme.sh` 通过 DNS 挑战的方式申请泛域名证书，且通过这种方式，我们可以很方面的申请 SSL 证书用于我们的内部服务，不会遇到因为使用自签名证书导致的各种麻烦。

<!-- more -->

acme.sh 支持非常多的 DNS 提供商的 DNS API，通过 DNS API 可以免去手动填写 \_acme-challenge 的麻烦。

## 以 Cloudflare 为例

首先我们查看一下 acne.sh 需要 Cloudflare 什么信息：[dns_cf.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_cf.sh)

```sh
#!/usr/bin/env sh
# shellcheck disable=SC2034
dns_cf_info='CloudFlare
Site: CloudFlare.com
Docs: github.com/acmesh-official/acme.sh/wiki/dnsapi#dns_cf
Options:
 CF_Key API Key
 CF_Email Your account email
OptionsAlt:
 CF_Token API Token
 CF_Account_ID Account ID
 CF_Zone_ID Zone ID. Optional.
'
```

也可以看 acme.sh 的 wiki 是怎么写的，不过我觉得代码比 wiki 更诚实一点：

> As of June 2025, the Cloudflare Domain API can be accessed using three kinds of API keys:
>
> User token;
> Account-owned token; or
> User Global API Key (Not recommended).

我们采用第一个方法，User token.

去 Cloudflare 的控制面板拿到如下的凭证

```sh
CF_Token="Y7VRjJ_**"
CF_Zone_ID="5f011**"
CF_Account_ID="29b0**"
```

不管是签发还是续签，添加 `--dns_cf` 参数即可

```sh
# 续签
/usr/share/acme.sh/acme.sh --cron --dns_cf --home /certs

# 签发
/usr/share/acme.sh/acme.sh --issue -d krystzal.dev --dns_cf --home /certs
```

## 使用 `systemd-timer` 来实现定时刷新

我们可以使用 `systemd-timer` 来替代 `crontab` 实现定时续签，这里以每天续签为例

```ini
# acme.sh.service
[Unit]
Description=Renew certificates acquired via acme.sh
After=network.target network-online.target nss-lookup.target
Wants=network-online.target nss-lookup.target
Documentation=https://github.com/acmesh-official/acme.sh/wiki

[Service]
User=cert
Group=cert
Type=simple
ExecStart=/bin/acme.sh --cron --dns dns_cf --home /certs --dnssleep 600
SuccessExitStatus=0 2
Restart=on-failure
EnvironmentFile=/etc/systemd/system/acme.sh.env
```

```ini
# acme.sh.timer
[Unit]
Description=Run acme.sh daily

[Timer]
OnCalendar=*-*-* 00:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```sh
# acmd.sh.env
CF_Token="Y7VRjJ_**"
CF_Zone_ID="5f011**"
CF_Account_ID="29b0**"
```

然后执行一下刷新 `systemd-daemon`，接着启用一下 `acme.sh.timer`

```sh
systemctl daemon-reload
systemctl enable acme.sh.timer
```

## 支持的 DNS API 列表

> [!NOTE]
> 这个列表更新于 2026-02-25，而 acme.sh 会随着时间更新，因此请查看其[仓库](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_cf.sh)获得最新的列表

在每个 DNS API 具体操作的 `.sh` 的文件开头有写需要什么 API密钥，前往 DNS 服务商面板获取后写作具体的环境变量即可

- [dns_1984hosting.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_1984hosting.sh)
- [dns_acmedns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_acmedns.sh)
- [dns_acmeproxy.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_acmeproxy.sh)
- [dns_active24.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_active24.sh)
- [dns_ad.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_ad.sh)
- [dns_ali.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_ali.sh)
- [dns_alviy.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_alviy.sh)
- [dns_anx.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_anx.sh)
- [dns_artfiles.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_artfiles.sh)
- [dns_arvan.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_arvan.sh)
- [dns_aurora.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_aurora.sh)
- [dns_autodns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_autodns.sh)
- [dns_aws.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_aws.sh)
- [dns_azion.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_azion.sh)
- [dns_azure.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_azure.sh)
- [dns_beget.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_beget.sh)
- [dns_bookmyname.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_bookmyname.sh)
- [dns_bunny.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_bunny.sh)
- [dns_cf.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_cf.sh)
- [dns_clouddns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_clouddns.sh)
- [dns_cloudns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_cloudns.sh)
- [dns_cn.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_cn.sh)
- [dns_conoha.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_conoha.sh)
- [dns_constellix.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_constellix.sh)
- [dns_cpanel.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_cpanel.sh)
- [dns_curanet.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_curanet.sh)
- [dns_cyon.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_cyon.sh)
- [dns_da.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_da.sh)
- [dns_ddnss.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_ddnss.sh)
- [dns_desec.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_desec.sh)
- [dns_df.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_df.sh)
- [dns_dgon.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_dgon.sh)
- [dns_dnsexit.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_dnsexit.sh)
- [dns_dnshome.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_dnshome.sh)
- [dns_dnsimple.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_dnsimple.sh)
- [dns_dnsservices.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_dnsservices.sh)
- [dns_doapi.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_doapi.sh)
- [dns_domeneshop.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_domeneshop.sh)
- [dns_dpi.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_dpi.sh)
- [dns_dp.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_dp.sh)
- [dns_dreamhost.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_dreamhost.sh)
- [dns_duckdns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_duckdns.sh)
- [dns_durabledns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_durabledns.sh)
- [dns_dyn.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_dyn.sh)
- [dns_dynu.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_dynu.sh)
- [dns_dynv6.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_dynv6.sh)
- [dns_easydns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_easydns.sh)
- [dns_edgecenter.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_edgecenter.sh)
- [dns_edgedns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_edgedns.sh)
- [dns_efficientip.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_efficientip.sh)
- [dns_euserv.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_euserv.sh)
- [dns_exoscale.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_exoscale.sh)
- [dns_fornex.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_fornex.sh)
- [dns_freedns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_freedns.sh)
- [dns_freemyip.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_freemyip.sh)
- [dns_gandi_livedns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_gandi_livedns.sh)
- [dns_gcloud.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_gcloud.sh)
- [dns_gcore.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_gcore.sh)
- [dns_gd.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_gd.sh)
- [dns_geoscaling.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_geoscaling.sh)
- [dns_googledomains.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_googledomains.sh)
- [dns_he_ddns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_he_ddns.sh)
- [dns_he.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_he.sh)
- [dns_hetznercloud.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_hetznercloud.sh)
- [dns_hetzner.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_hetzner.sh)
- [dns_hexonet.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_hexonet.sh)
- [dns_hostingde.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_hostingde.sh)
- [dns_hostup.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_hostup.sh)
- [dns_huaweicloud.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_huaweicloud.sh)
- [dns_infoblox.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_infoblox.sh)
- [dns_infoblox_uddi.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_infoblox_uddi.sh)
- [dns_infomaniak.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_infomaniak.sh)
- [dns_internetbs.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_internetbs.sh)
- [dns_inwx.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_inwx.sh)
- [dns_ionos_cloud.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_ionos_cloud.sh)
- [dns_ionos.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_ionos.sh)
- [dns_ipv64.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_ipv64.sh)
- [dns_ispconfig.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_ispconfig.sh)
- [dns_jd.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_jd.sh)
- [dns_joker.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_joker.sh)
- [dns_kappernet.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_kappernet.sh)
- [dns_kas.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_kas.sh)
- [dns_kinghost.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_kinghost.sh)
- [dns_knot.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_knot.sh)
- [dns_la.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_la.sh)
- [dns_leaseweb.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_leaseweb.sh)
- [dns_lexicon.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_lexicon.sh)
- [dns_limacity.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_limacity.sh)
- [dns_linode.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_linode.sh)
- [dns_linode_v4.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_linode_v4.sh)
- [dns_loopia.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_loopia.sh)
- [dns_lua.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_lua.sh)
- [dns_maradns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_maradns.sh)
- [dns_me.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_me.sh)
- [dns_mgwm.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_mgwm.sh)
- [dns_miab.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_miab.sh)
- [dns_mijnhost.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_mijnhost.sh)
- [dns_misaka.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_misaka.sh)
- [dns_myapi.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_myapi.sh)
- [dns_mydevil.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_mydevil.sh)
- [dns_mydnsjp.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_mydnsjp.sh)
- [dns_mythic_beasts.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_mythic_beasts.sh)
- [dns_namecheap.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_namecheap.sh)
- [dns_namecom.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_namecom.sh)
- [dns_namesilo.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_namesilo.sh)
- [dns_nanelo.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_nanelo.sh)
- [dns_nederhost.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_nederhost.sh)
- [dns_neodigit.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_neodigit.sh)
- [dns_netcup.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_netcup.sh)
- [dns_netlify.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_netlify.sh)
- [dns_nic.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_nic.sh)
- [dns_njalla.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_njalla.sh)
- [dns_nm.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_nm.sh)
- [dns_nsd.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_nsd.sh)
- [dns_nsone.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_nsone.sh)
- [dns_nsupdate.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_nsupdate.sh)
- [dns_nw.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_nw.sh)
- [dns_oci.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_oci.sh)
- [dns_omglol.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_omglol.sh)
- [dns_one.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_one.sh)
- [dns_online.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_online.sh)
- [dns_openprovider_rest.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_openprovider_rest.sh)
- [dns_openprovider.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_openprovider.sh)
- [dns_openstack.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_openstack.sh)
- [dns_opnsense.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_opnsense.sh)
- [dns_ovh.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_ovh.sh)
- [dns_pdns.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_pdns.sh)
- [dns_pleskxml.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_pleskxml.sh)
- [dns_pointhq.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_pointhq.sh)
- [dns_porkbun.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_porkbun.sh)
- [dns_qc.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_qc.sh)
- [dns_rackcorp.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_rackcorp.sh)
- [dns_rackspace.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_rackspace.sh)
- [dns_rage4.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_rage4.sh)
- [dns_rcode0.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_rcode0.sh)
- [dns_regru.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_regru.sh)
- [dns_scaleway.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_scaleway.sh)
- [dns_schlundtech.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_schlundtech.sh)
- [dns_selectel.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_selectel.sh)
- [dns_selfhost.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_selfhost.sh)
- [dns_servercow.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_servercow.sh)
- [dns_simply.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_simply.sh)
- [dns_sotoon.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_sotoon.sh)
- [dns_spaceship.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_spaceship.sh)
- [dns_technitium.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_technitium.sh)
- [dns_tele3.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_tele3.sh)
- [dns_tencent.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_tencent.sh)
- [dns_timeweb.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_timeweb.sh)
- [dns_transip.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_transip.sh)
- [dns_udr.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_udr.sh)
- [dns_ultra.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_ultra.sh)
- [dns_unoeuro.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_unoeuro.sh)
- [dns_variomedia.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_variomedia.sh)
- [dns_veesp.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_veesp.sh)
- [dns_vercel.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_vercel.sh)
- [dns_virakcloud.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_virakcloud.sh)
- [dns_vscale.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_vscale.sh)
- [dns_vultr.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_vultr.sh)
- [dns_websupport.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_websupport.sh)
- [dns_west_cn.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_west_cn.sh)
- [dns_world4you.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_world4you.sh)
- [dns_yandex360.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_yandex360.sh)
- [dns_yc.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_yc.sh)
- [dns_zilore.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_zilore.sh)
- [dns_zoneedit.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_zoneedit.sh)
- [dns_zone.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_zone.sh)
- [dns_zonomi.sh](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_zonomi.sh)
