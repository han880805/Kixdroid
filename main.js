const discord = require("discord.js");
const ytdl = require('ytdl-core');
const client = new discord.Client();
const config = require("./config.json");

let queue = {};

const commands = {
  "play": async (msg) => {
    if (msg.content.toLowerCase().split(config.prefix)[1].split(' ')[1]) {
      await commands.add(msg.content.split(' ')[1],msg);
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
          let stream = ytdl.downloadFromInfo(song.info, {filter: 'audioonly'});
          dispatcher = msg.guild.voiceConnection.playStream(stream);
          let collector = msg.channel.createCollector(m => m);
          collector.on('collect', m => {
            if (m.content.startsWith(config.prefix + 'pause')) {
              msg.channel.send('已暫停').then(() => {dispatcher.pause();});
            } else if (m.content.startsWith(config.prefix + 'resume')){
              msg.channel.send('已恢復播放').then(() => {dispatcher.resume();});
            } else if (m.content.startsWith(config.prefix + 'skip')){
              msg.channel.send('已跳過這首歌').then(() => {dispatcher.end();});
            }
          });
          dispatcher.on('start', () => {
            msg.channel.send(`正在播放由 **${song.requester}** 所點的 **${song.info.title}**`);
            console.log(queue);
          });
          let tmp = queue[msg.guild.id].songs.shift();
          dispatcher.on('error',async (err) => {
            error(msg,err);
            collector.stop();
            if (tmp === undefined) await commands.add(song.info.related_videos[0].id,msg);
            p(p)(queue[msg.guild.id].songs.shift());
          });
          dispatcher.on('end', async() => {
            collector.stop();
            if (tmp === undefined) await commands.add(song.info.related_videos[0].id,msg);
            p(p)(queue[msg.guild.id].songs.shift());
          });
        }
      )
    )(queue[msg.guild.id].songs.shift());
  },
  "list": (msg) => {

  },
  "autoplay": (msg) => {

  },
  "add": (url,msg) => {
    return new Promise(function (resolve, reject) {
      ytdl.getInfo(url, (err, info) => {
        if (info) {
          if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].autoplay = true, queue[msg.guild.id].songs = [];
          queue[msg.guild.id].songs.push({ info: info, url: url, title: info.title, requester: msg.author.username });
          msg.channel.send(`已將 **${info.title}** 加入至播放列表`);
          resolve(true);
        }
      });
    });
  }
}

function error(msg, e) {
  console.error(e);
  msg.channel.send("出了點小差錯 欸嘿");
}

client.on("message", (msg) => {
  if (!msg.content.startsWith(config.prefix)) return;
  else if (commands.hasOwnProperty(msg.content.toLowerCase().split(config.prefix)[1].split(' ')[0])) commands[msg.content.toLowerCase().split(config.prefix)[1].split(' ')[0]](msg);
});

client.on("ready", () => {
  console.log("I am ready!");
});

client.login(config.token);