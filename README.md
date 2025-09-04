# Emojiquiz-Bot
<p>Emojiquiz Bot using <a href="https://github.com/JeezyDev/discord-emojiquiz">discord-emojiquiz</a> package! 🤳🥳😎</p>
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
</a>
