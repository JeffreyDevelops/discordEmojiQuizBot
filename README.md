# Emojiquiz-Bot
<p>Emojiquiz Bot using <a href="https://github.com/JeezyDev/discord-emojiquiz">discord-emojiquiz</a> package! 🤳🥳😎</p>
<a href="https://discord.gg/ybvMTNHcnq">
<img src="https://camo.githubusercontent.com/e59dea1d9d0632f966c15a10dd746907a3ff03d27b0f074b37d450776290f2ac/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f436861742d436c69636b253230686572652d3732383964393f7374796c653d666f722d7468652d6261646765266c6f676f3d646973636f7264">
</img>
<h2>Features</h2>
<ul>
<li><code>emojiquiz-create</code></li>
<li><code>emojiquiz-setup</code></li>
<li><code>emojiquiz-delete</code></li>
<li><code>emojiquiz-reset</code></li>
</ul>
<img src="https://user-images.githubusercontent.com/88632169/182969775-4453fc67-f233-4990-80e7-f04508c3890a.png"></img>
<img src="https://user-images.githubusercontent.com/88632169/182969840-d48d7643-7736-4a3e-8f35-76fe68af680f.png"></img>
<h2>Installation</h2>


```javascript
const Emojiquiz = require('./classes/Emojiquiz.js')
const emojiquiz = new Emojiquiz();
emojiquiz.host = "localhost";
emojiquiz.user = "root";
emojiquiz.password = "";
emojiquiz.database = "emojiquiz";
emojiquiz.charset = 'utf8mb4';
emojiquiz.bigNumbers = true;
module.exports = {emojiquiz};
```
<ul>
<li>Put in mysql details</li>
</ul>
<h2>Start</h2>

<ul>
<li>Don't forget to create a <code>config.json</code> file to enter the <code>token</code> and the <code>clientID</code></li>
</ul>

```javascript
{
    "token": "",
    "clientID": ""
}
```

<ul>
<li>Install nodemon and do npm start or change package.json start script and then do node ./index.js</li>
</ul>

```javascript

 "scripts": {
    "start": "nodemon"
  }


```


<h2>That's it!</h2>
<p>Hope you have fun with this package and enjoy playing emojiquizzes. 🤳🥳😎
<p>If you still need support! 👇</p>
  <a href="https://discord.gg/ybvMTNHcnq">
<img src="https://camo.githubusercontent.com/e59dea1d9d0632f966c15a10dd746907a3ff03d27b0f074b37d450776290f2ac/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f436861742d436c69636b253230686572652d3732383964393f7374796c653d666f722d7468652d6261646765266c6f676f3d646973636f7264">
</img>
</a>
