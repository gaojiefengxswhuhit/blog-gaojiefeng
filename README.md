# 高杰峰的博客

这是一个 Hugo + PaperMod 静态博客，通过 Cloudflare Pages 部署。

## 在线编辑后台

后台地址：

```text
https://blog.xushuo.uk/admin/
```

后台使用 Decap CMS。登录后可以在线创建和编辑文章，也可以在正文中插入图片，或在文章底部添加附件下载列表。

保存内容时，CMS 会把 Markdown 文章和上传文件提交到 GitHub 仓库。Cloudflare Pages 检测到 GitHub 更新后，会自动重新部署网站。

## 第一次启用后台

1. 在 GitHub 创建 OAuth App：
   - Homepage URL: `https://blog.xushuo.uk`
   - Authorization callback URL: `https://blog.xushuo.uk/api/callback`
2. 在 Cloudflare Pages 项目的环境变量中添加：
   - `GITHUB_OAUTH_CLIENT_ID`: GitHub OAuth App 的 Client ID
   - `GITHUB_OAUTH_CLIENT_SECRET`: GitHub OAuth App 的 Client Secret
   - `CMS_ALLOWED_GITHUB_USERS`: 允许登录后台的 GitHub 用户名，多个用户用英文逗号分隔。默认只允许 `gaojiefengxswhuhit`
   - `GITHUB_OAUTH_SCOPE`: 默认可不填，公开仓库使用 `public_repo`；如果仓库改成私有仓库，设为 `repo`
   - `OAUTH_BASE_URL`: 默认可不填；如果 Cloudflare 回调域名异常，设为 `https://blog.xushuo.uk`
3. Cloudflare Pages 构建设置保持：
   - Build command: `hugo --gc --minify`
   - Build output directory: `public`

## 内容文件位置

- 文章：`content/posts/`
- 上传图片和附件：`static/uploads/`
- 后台配置：`static/admin/config.yml`
- GitHub OAuth Pages Functions：`functions/api/auth.js` 和 `functions/api/callback.js`

