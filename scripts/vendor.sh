#!/usr/bin/env bash
# 下载前端依赖到本地（国内服务器使用，避免海外 CDN 加载慢/失败）
# 在阿里云服务器上执行： bash scripts/vendor.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
V="$ROOT/public/assets/vendor"

echo "== 创建目录 =="
mkdir -p "$V/echarts" "$V/flag-icon/css" "$V/flag-icon/flags" "$V/font-awesome/css" "$V/font-awesome/webfonts"

echo "== 下载 echarts =="
curl -fsSL "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js" -o "$V/echarts.min.js"

echo "== 下载 flag-icon-css =="
curl -fsSL "https://cdn.jsdelivr.net/npm/flag-icon-css@3.5.0/css/flag-icon.min.css" -o "$V/flag-icon/css/flag-icon.min.css"
# 下载常用国旗（英、中、及主要足球国家），如需更多可在下面追加
# 注意：gb-eng/gb-sct/gb-wls/gb-nir 是英国构成国旗帜（flag-icon-css 支持）
FLAGS="gb gb-eng gb-sct gb-wls gb-nir cn fr es de it pt br ar be hr dk nl se no pl jp kr us \
cd ng ba au ie jm fi ml tr ma sn gh cm eg za ch at cz ro ua rs si sk hu gr mx co cl uy pe ec ve py cr ca"
for f in $FLAGS; do
  curl -fsSL "https://cdn.jsdelivr.net/npm/flag-icon-css@3.5.0/flags/4x3/$f.svg" -o "$V/flag-icon/flags/$f.svg"
done

echo "== 下载 font-awesome =="
curl -fsSL "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" -o "$V/font-awesome/css/all.min.css"
# 下载 css 中引用的 webfonts
for w in fa-solid-900 fa-regular-400 fa-brands-400; do
  curl -fsSL "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/$w.ttf" -o "$V/font-awesome/webfonts/$w.ttf"
  curl -fsSL "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/$w.woff2" -o "$V/font-awesome/webfonts/$w.woff2"
done

echo "✅ 本地静态库已就绪：$V"
