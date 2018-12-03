import { Meteor } from 'meteor/meteor';

Meteor.methods({
	async getUsersOfRoom(rid, showAll) {
		const userId = Meteor.userId();
		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'getUsersOfRoom' });
		}

		const room = Meteor.call('canAccessRoom', rid, userId);
		if (!room) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'getUsersOfRoom' });
		}

		if (room.broadcast && !RocketChat.authz.hasPermission(userId, 'view-broadcast-member-list', rid)) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'getUsersOfRoom' });
		}

		const subscriptions = RocketChat.models.Subscriptions.findByRoomIdWhenUsernameExists(rid);

		return {
			total: subscriptions.count(),
			records: await RocketChat.models.Subscriptions.model.rawCollection().aggregate([
				{ $match: { rid } },

				{
					$lookup:
						{
							from: 'users',
							localField: 'u._id',
							foreignField: '_id',
							as: 'u',
						},
				},
				...(showAll ? [{ $match: { 'u.status': 'online' } }] : []),
				{
					$project: {
						$replaceRoot: { newRoot: { $arrayElemAt: [ "$u", 0 ] } }
					},
				},

			]).toArray(),
		};
	},
});
