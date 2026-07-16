#!/bin/sh
patch_file="/app/node_modules/next/dist/server/lib/router-utils/block-cross-site.js"
sed -i 's/const blockCrossSite = (req, res, allowedDevOrigins, hostname)=>{/const blockCrossSite = (req, res, allowedDevOrigins, hostname)=>{ return false;/' "$patch_file"
exec npm run dev -- --hostname 0.0.0.0
