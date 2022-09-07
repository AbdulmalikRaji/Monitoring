'use strict';

const express = require('express');
const cors = require('cors')
const app = express();
const axios = require("axios");
const childProc = require("child_process");
const CHILD_PROCESSES = 10;

app.use(cors({
  origin: '*', 
}));
app.options('*', cors());

const { Datastore } = require('@google-cloud/datastore');
const URL_TO_CHECK = "http://trendbox.io/";
const Delivery_Email = "2g2mny@gmail.com";



const mailgun = require("mailgun-js");
const DOMAIN = "sandbox577e50e139204f7f9facb5cd3d68fe76.mailgun.org";
const mg = mailgun({ apiKey: "24efb4e8bd86c60b14b87023e0489338-c76388c3-148c3150", domain: DOMAIN });

const datastore = new Datastore();

const insertVisit = (visit) => {
  return datastore.save({
    key: datastore.key('visit'),
    data: visit,
  });
};

const getVisits = () => {
  const query = datastore
    .createQuery('visit')
    .order('timestamp', { descending: true })
    .limit(100);

  return datastore.runQuery(query);
};

const reportError = (error) => {
  const data = {
    from: "Mailgun Sandbox <postmaster@sandbox577e50e139204f7f9facb5cd3d68fe76.mailgun.org>",
    to: `${Delivery_Email}`,
    subject: `${URL_TO_CHECK} is down!`,
    text: `Please check what's wrong with your server \n${error}`
  };
  mg.messages().send(data, function (error, body) {
    console.log(body);
  });
}

app.use((req, res, next) => {
  res.append('Access-Control-Allow-Origin', '*');
  res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.append('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Expose-Headers', '*');
  next();
});
app.get('/', async (req, res, next) => {
  try {
    const [entities] = await getVisits();
    const visits = entities.map(
      (entity) => `Time: ${entity.timestamp}, Response Time: ${entity.responseDuration}ms, Successful: ${entity.successful}`
    );
    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .set('Access-Control-Expose-Headers', '*')
      .send(`Last 100 checks:\n${visits.join('\n')}`)
      .end();
  } catch (error) {
    next(error);
  }
});

app.get('/test', async (req, response, next) => {
  axios.interceptors.request.use(function (config) {
    config.metadata = { startTime: new Date() }
    return config;
  }, function (error) {
    return Promise.reject(error);
  });

  axios.interceptors.response.use(function (response) {
    response.config.metadata.endTime = new Date()
    response.duration = response.config.metadata.endTime - response.config.metadata.startTime
    return response;
  }, function (error) {
    return Promise.reject(error);
  });

  let visit = {}
  axios.get(URL_TO_CHECK)
    .then((response) => {
      visit = {
        timestamp: new Date(),
        responseDuration: response.duration,
        successful: true
      };
    })
    .catch((error) => {
      visit = {
        timestamp: new Date(),
        successful: false
      };
      console.log(error);
      reportError(error);
    })
    .then(async function () {
      // always executed
      try {
        await insertVisit(visit);
      } catch (error) {
        next(error);
      }

      response.status(200).send(visit).end();
    });
});




app.get('/load', async (req, response, next) => {
  (async () => {
    let times = [];
    let children = [];
    let result = [];
  
    for (let i = 0; i < CHILD_PROCESSES; i++) {
      let childProcess = childProc.spawn("node", ["child.js", `--url=${URL_TO_CHECK}`])
      children.push(childProcess);
    }
  
    let responses = children.map(function wait(child) {
      return new Promise(function c(res) { 
        child.stdout.on('data', (data) => {
          times.push(parseInt(data));
          result.push(`child response time: ${data}`);
          
        });
        child.on("exit", function (code) {
          if (code === 0) {
            res(true);
          } else {
            res(false);
          }
        });
      });
    });
  
    responses = await Promise.all(responses);

  
    if (responses.filter(Boolean).length == responses.length) {
      const sum = times.reduce((a, b) => a + b, 0);
      const avg = (sum / times.length) || 0;
      result.push(`average: ${avg}`, [-1]);
      console.log("success!");
      response
      .status(200)
      .set('Content-Type', 'text/plain')
      .set('Access-Control-Expose-Headers', '*')
      .send(`Load checks:\n${result.join('\n')}`)
      .end();
    } else {
      console.log("failures!");
    }
  })();

});





const PORT = process.env.PORT || 5060;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app;