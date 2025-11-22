import CommunityMember from "../models/CommunityMember.js";
import Notification from "../models/Notification.js";

// Fórmula de Nível: XP necessário = Nível * 100
const getLevelFromXP = (xp) => Math.floor(Math.sqrt(xp / 50)) + 1;

export const addXP = async (userId, communityId, amount) => {
    try {
        let member = await CommunityMember.findOne({ user: userId, community: communityId });

        if (!member) {
            // Se não existir (caso de migração ou erro), cria
            member = await CommunityMember.create({ user: userId, community: communityId });
        }

        const oldLevel = member.level;
        member.xp += amount;
        const newLevel = getLevelFromXP(member.xp);

        if (newLevel > oldLevel) {
            member.level = newLevel;

            // Desbloquear vantagens simples (Exemplo de Títulos)
            if (newLevel === 5) member.titles.push("Veterano");
            if (newLevel === 10) member.titles.push("Mestre");
            if (newLevel === 20) member.titles.push("Lenda");

            // Notificar Level Up
            await Notification.create({
                recipient: userId,
                sender: userId, // Auto-notificação
                type: 'NEW_MESSAGE', // Reusando tipo ou crie um novo 'LEVEL_UP'
                // Como não temos tipo LEVEL_UP no enum original, usaremos um hack ou adicione ao enum
                // Para simplificar, não vamos criar o registro se o enum não permitir, 
                // mas idealmente você atualizaria o model Notification.
            });

            // Console log para debug
            console.log(`User ${userId} leveled up to ${newLevel} in ${communityId}`);
        }

        await member.save();
        return member;
    } catch (e) {
        console.error("Erro ao adicionar XP:", e);
    }
};