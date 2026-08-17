const { embed } = require('../utils/embed');
const { sendLog } = require('../services/logService');
const { handleVoiceUpdate } = require('../services/tempVoiceService');

const prevVoice = new Map();

module.exports = {
  name: 'voiceStateUpdate',
  async run(client, oldState, newState) {
    if (!oldState.guild || oldState.member?.user?.bot) return;

    await handleVoiceUpdate(client, oldState, newState);

    const member = newState.member || oldState.member;
    const oldChan = oldState.channel;
    const newChan = newState.channel;
    if (oldChan?.id === newChan?.id) return;

    let title = '';
    let description = '';
    if (!oldChan && newChan) {
      title = '🔊 دخول روم صوتي';
      description = `**${member.user.tag}** دخل الى ${newChan}`;
    } else if (oldChan && !newChan) {
      title = '🔇 خروج من روم صوتي';
      description = `**${member.user.tag}** خرج من ${oldChan}`;
    } else {
      title = '🔀 تنقل صوتي';
      description = `**${member.user.tag}** انتقل من ${oldChan} الى ${newChan}`;
    }

    const logEmbed = embed(newState.guild, {
      title,
      description,
      thumbnail: member.user.displayAvatarURL({ size: 256 }),
    });
    await sendLog(newState.guild, 'voice', logEmbed);
  },
};
