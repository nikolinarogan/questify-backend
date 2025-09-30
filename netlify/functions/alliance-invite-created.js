const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "questify-7fb3e",
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { invite } = JSON.parse(event.body);
    
    // Get friend's FCM token
    const friendDoc = await admin.firestore()
      .collection('userTokens')
      .doc(invite.toUserId)
      .get();
    
    if (friendDoc.exists) {
      const friendToken = friendDoc.data().fcmToken;
      
      // Send notification
      await admin.messaging().send({
        token: friendToken,
        notification: {
          title: "Alliance Invitation",
          body: `${invite.fromUserName} invited you to join ${invite.allianceName}`
        },
        data: {
          type: "alliance_invite",
          allianceId: invite.allianceId,
          inviteId: invite.id,
          allianceName: invite.allianceName,
          fromUserName: invite.fromUserName
        },
        android: {
          notification: {
            priority: 'high',
            sticky: true
          }
        }
      });
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Notification sent successfully' 
        })
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'Friend token not found' 
        })
      };
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};