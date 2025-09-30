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
    const { before, after } = JSON.parse(event.body);
    
    if (before.status === 'PENDING' && after.status !== 'PENDING') {
      // Get creator's FCM token
      const creatorDoc = await admin.firestore()
        .collection('userTokens')
        .doc(after.fromUserId)
        .get();
      
      if (creatorDoc.exists) {
        const creatorToken = creatorDoc.data().fcmToken;
        
        const message = after.status === 'ACCEPTED' 
          ? `${after.toUserName} joined your alliance!`
          : `${after.toUserName} declined your invitation.`;
          
        await admin.messaging().send({
          token: creatorToken,
          notification: {
            title: "Alliance Update",
            body: message
          },
          data: {
            type: "alliance_response",
            allianceId: after.allianceId
          }
        });
        
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            message: 'Response notification sent successfully' 
          })
        };
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'No notification needed' 
      })
    };
  } catch (error) {
    console.error('Error sending response notification:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};