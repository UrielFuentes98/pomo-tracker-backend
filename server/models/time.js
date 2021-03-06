const { Model, Op } = require("sequelize");
let dayjs = require("dayjs");

const dateFormat = "YYYY-MM-DD";
var customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);
var isoWeek = require("dayjs/plugin/isoWeek");
dayjs.extend(isoWeek);

module.exports = (sequelize, DataTypes) => {
  class Time extends Model {
    static associate({ User }) {
      Time.belongsTo(User);
    }
  }
  Time.init(
    {
      time_sec: DataTypes.INTEGER,
      pomodoros: DataTypes.INTEGER,
      date: DataTypes.DATEONLY,
    },
    {
      sequelize,
      modelName: "Time",
      timestamps: false,
    }
  );

  Time.updateRecord = async function (
    user,
    time,
    pomodoro,
    userDate = dayjs().format(dateFormat)
  ) {
    const numPomodoro = pomodoro == "true" ? 1 : 0;

    //Check if today record already exists for user
    const result = await Time.findOne({
      where: {
        UserId: user.id,
        date: userDate,
      },
    });
    if (result) {
      //Update today record
      const updatedReg = await result.update({
        time_sec: result.time_sec + parseInt(time),
        pomodoros: result.pomodoros + numPomodoro,
      });
      if (!updatedReg) {
        return Promise.reject("Couldnt update time record");
      } else {
        return "Time record updated";
      }
    } else {
      //Record new data for today
      const newReg = await Time.create({
        time_sec: parseInt(time),
        pomodoros: numPomodoro,
        date: userDate,
        UserId: user.id,
      });
      if (!newReg) {
        return Promise.reject("Couldnt create new time record.");
      } else {
        return "New time record created";
      }
    }
  };

  Time.getStats = async function (user, userDate = dayjs().format(dateFormat)) {
    //Object to store main stats to return
    let Stats = {
      username: user.username,
      secToday: 0,
      pomoToday: 0,
      secWeek: 0,
      pomoWeek: 0,
      secMonth: 0,
      pomoMonth: 0,
    };

    //Find stats for today and save them
    const today = await Time.findOne({
      where: {
        UserId: user.id,
        date: userDate,
      },
    });

    if (today) {
      Stats.secToday = today.time_sec;
      Stats.pomoToday = today.pomodoros;
    }

    //Find stats for last week
    const weekData = await Time.findAll({
      where: {
        UserId: user.id,
        date: {
          [Op.between]: [
            dayjs(userDate, dateFormat).isoWeekday(1).format(dateFormat),
            userDate,
          ],
        },
      },
    });

    //Loop through results to aggregate and store them
    for (let i = 0; i < weekData.length; i++) {
      Stats.secWeek += weekData[i].time_sec;
      Stats.pomoWeek += weekData[i].pomodoros;
    }

    //Find stats for last month
    const monthData = await Time.findAll({
      where: {
        UserId: user.id,
        date: {
          [Op.between]: [
            dayjs(userDate, dateFormat).date(1).format(dateFormat),
            userDate,
          ],
        },
      },
    });

    //Loop through results to aggregate and store them
    for (let i = 0; i < monthData.length; i++) {
      Stats.secMonth += monthData[i].time_sec;
      Stats.pomoMonth += monthData[i].pomodoros;
    }

    return Stats;
  };

  return Time;
};
