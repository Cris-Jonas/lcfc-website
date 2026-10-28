#!/usr/bin/env bash
# 下载前端依赖到本地（国内服务器使用，避免海外 CDN 加载慢/失败）
# 在阿里云服务器上执行： bash scripts/vendor.sh
# 已内置重试 + 多镜像（jsdelivr / fastly / staticfile），单个文件失败不会中断整体。
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
V="$ROOT/public/assets/vendor"

# npm 镜像（echarts / flag-icon-css 走这里）
dl_npm() {   # $1=relpath  $2=out
  for host in cdn.jsdelivr.net/npm fastly.jsdelivr.net/npm cdn.staticfile.org/npm; do
    for i in 1 2 3; do
      if curl -fsSL --connect-timeout 15 --max-time 90 "https://$host/$1" -o "$2"; then return 0; fi
      echo "    ↻ 重试 $host ($i) ..."; sleep 1
    done
  done
  echo "  ✘ 失败: $1"; return 1
}
# cdnjs 镜像（font-awesome 走这里）
dl_cdnjs() { # $1=relpath  $2=out
  for host in cdnjs.cloudflare.com/ajax/libs cdn.staticfile.org/ajax/libs; do
    for i in 1 2 3; do
      if curl -fsSL --connect-timeout 15 --max-time 90 "https://$host/$1" -o "$2"; then return 0; fi
      echo "    ↻ 重试 $host ($i) ..."; sleep 1
    done
  done
  echo "  ✘ 失败: $1"; return 1
}

echo "== 创建目录 =="
mkdir -p "$V/echarts" "$V/flag-icon/css" "$V/flag-icon/flags" "$V/font-awesome/css" "$V/font-awesome/webfonts"

echo "== 下载 echarts =="
dl_npm "echarts@5/dist/echarts.min.js" "$V/echarts.min.js"

echo "== 下载 flag-icon-css =="
dl_npm "flag-icon-css@3.5.0/css/flag-icon.min.css" "$V/flag-icon/css/flag-icon.min.css"
# 下载常用国旗（英、中、及主要足球国家），如需更多可在下面追加
# 注意：gb-eng/gb-sct/gb-wls/gb-nir 是英国构成国旗帜（flag-icon-css 支持）
FLAGS="gb gb-eng gb-sct gb-wls gb-nir cn fr es de it pt br ar be hr dk nl se no pl jp kr us \
cd ng ba au ie jm fi ml tr ma sn gh cm eg za ch at cz ro ua rs si sk hu gr mx co cl uy pe ec ve py cr ca"
for f in $FLAGS; do
  dl_npm "flag-icon-css@3.5.0/flags/4x3/$f.svg" "$V/flag-icon/flags/$f.svg"
done

echo "== 下载 font-awesome =="
dl_cdnjs "font-awesome/6.0.0-beta3/css/all.min.css" "$V/font-awesome/css/all.min.css"
# 下载 css 中引用的 webfonts
for w in fa-solid-900 fa-regular-400 fa-brands-400; do
  dl_cdnjs "font-awesome/6.0.0-beta3/webfonts/$w.ttf" "$V/font-awesome/webfonts/$w.ttf"
  dl_cdnjs "font-awesome/6.0.0-beta3/webfonts/$w.woff2" "$V/font-awesome/webfonts/$w.woff2"
done

echo "✅ 本地静态库已就绪：$V"
echo "   若上面有 ✘ 失败项，可再跑一次本脚本（已下载的会覆盖重试）。"
