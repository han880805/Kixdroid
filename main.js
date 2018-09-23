const discord = require("discord.js");
const ytdl = require('ytdl-core');
const client = new discord.Client();
const config = require("./config.json");
let queue = {};
const commands = {
  "play": async (msg) => {
    if (msg.content.toLowerCase().split(config.prefix)[1].split(' ')[1]) {
      await commands.add(msg.content.split(' ')[1], msg);
      if (queue[msg.guild.id].playing) return;
    }
    else if (queue[msg.guild.id] === undefined) return msg.channel.send(`請先以加入一些歌曲呦`);
    else if (queue[msg.guild.id].playing) return msg.channel.send('已經在播放了啦');
    let dispatcher;
    console.log(queue);
    (((p) => p(p))
      ((p) =>
        async (song) => {
          if (!msg.guild.voiceConnection) {
            if (msg.member.voiceChannel) await msg.member.voiceChannel.join();
            else return msg.channel.send(`你不在語音頻道裡呀`);
          }
          if (song === undefined) return msg.channel.send('播放列表已經沒有歌曲了').then(() => {
            queue[msg.guild.id].playing = false;
            msg.member.voiceChannel.leave();
          });
          queue[msg.guild.id].playing = true;
          let stream = ytdl.downloadFromInfo(song.info);
          dispatcher = msg.guild.voiceConnection.playStream(stream);
          let collector = msg.channel.createCollector(m => m);
          collector.on('collect', m => {
            if (m.content.startsWith(config.prefix + 'pause')) {
              msg.channel.send('已暫停').then(() => { dispatcher.pause(); });
            } else if (m.content.startsWith(config.prefix + 'resume')) {
              msg.channel.send('已恢復播放').then(() => { dispatcher.resume(); });
            } else if (m.content.startsWith(config.prefix + 'skip')) {
              msg.channel.send('已跳過這首歌').then(() => { dispatcher.end(); });
            }
          });
          dispatcher.on('start', () => {
            msg.channel.send(new discord.RichEmbed().setAuthor(`目前播放`).setDescription(song.url).setTitle(song.info.title).setThumbnail(song.info.player_response.videoDetails.thumbnail.thumbnails.pop().url));
            console.log(queue);
          });
          let tmp = queue[msg.guild.id].songs.shift();
          dispatcher.on('error', async (err) => {
            error(msg, err);
            collector.stop();
            msg.author.username = "我";
            if ((tmp === undefined) && queue[msg.guild.id].autoplay) await commands.add(song.info.related_videos[0].id, msg);
            p(p)(queue[msg.guild.id].songs.shift());
          });
          dispatcher.on('end', async () => {
            collector.stop();
            msg.author.username = "我";
            if ((tmp === undefined) && queue[msg.guild.id].autoplay) await commands.add(song.info.related_videos[0].id, msg);
            p(p)(queue[msg.guild.id].songs.shift());
          });
        }
      )
    )(queue[msg.guild.id].songs.shift());
  },
  "list": (msg) => {
    let text = `\`\`\`\n`;
    if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].autoplay = true, queue[msg.guild.id].songs = [];
    for (let i in queue[msg.guild.id].songs) text += `${parseInt(i) + parseInt(1)}\t${queue[msg.guild.id].songs[i].info.title}\n`;
    if (text == `\`\`\`\n`) text = "播放清單內已經沒有更多歌曲囉";
    else text += `\`\`\``;
    msg.channel.send(text);
  },
  "autoplay": (msg) => {
    if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].autoplay = true, queue[msg.guild.id].songs = [];
    queue[msg.guild.id].autoplay = !queue[msg.guild.id].autoplay;
    msg.channel.send(`已將自動撥放${queue[msg.guild.id].autoplay ? "開啟" : "關閉"}囉`);
  },
  "add": (url, msg) => {
    return new Promise(function (resolve, reject) {
      ytdl.getInfo(url, (err, info) => {
        if (info) {
          if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].autoplay = true, queue[msg.guild.id].songs = [];
          queue[msg.guild.id].songs.push({ info: info, url: url, title: info.title, requester: msg.author.username });
          if(msg.author.username!="我") msg.channel.send(new discord.RichEmbed().setAuthor(`來自 ${msg.author.username} 的點播`).setDescription(url).setTitle(info.title).setThumbnail(info.player_response.videoDetails.thumbnail.thumbnails.pop().url));
          resolve(true);
        }
      });
    });
  },
  "move": (msg) => {
    if (msg.member.voiceChannel) msg.member.voiceChannel.join().then(()=>{msg.channel.send("我來了");});
  },
  "die": (msg) => {
    process.exit();
  }
}
client.on("message", (msg) => {
  if (!msg.content.startsWith(config.prefix)) return;
  else if (commands.hasOwnProperty(msg.content.toLowerCase().split(config.prefix)[1].split(' ')[0])) commands[msg.content.toLowerCase().split(config.prefix)[1].split(' ')[0]](msg);
});
client.on("ready", () => {
  console.log("I am ready!");
});
client.login(config.token);