const cloud = require('wx-server-sdk')

    cloud.init({
      env: cloud.DYNAMIC_CURRENT_ENV
    })

  const db = cloud.database()
  const _ = db.command

    exports.main = async (event, context) => {
      const wxContext = cloud.getWXContext()
      const openid = wxContext.OPENID
      // 接收新的字段：昵称和头像
  const { answers, totalValue, nickname, avatarUrl } = event

      try {
        const user = await db.collection('users').where({ openid }).get()

        const baseUpdate = {
          answers: answers,
          total_value: totalValue,
          update_time: db.serverDate()
        };
        if (nickname) baseUpdate.nickname = nickname;
        if (avatarUrl) baseUpdate.avatarUrl = avatarUrl;

        if (user.data.length > 0) {
          // 用户已存在，更新记录
          await db.collection('users').doc(user.data[0]._id).update({ data: baseUpdate })
          return {
            success: true,
            message: '更新成功'
          }
        } else {
          // 用户不存在，创建新记录
          const newDoc = {
            openid,
            answers,
            total_value: totalValue,
            is_captain: false,
            team_id: null,
            create_time: db.serverDate()
          };
          if (nickname) newDoc.nickname = nickname;
          if (avatarUrl) newDoc.avatarUrl = avatarUrl;

          // 以 openid 作为 _id，避免重复
          await db.collection('users').doc(openid).set({ data: newDoc })
          return {
            success: true,
            message: '创建成功'
          }
        }

      } catch (err) {
        console.error(err)
        return {
          success: false,
          message: '操作失败',
          error: err
        }
      }
    }