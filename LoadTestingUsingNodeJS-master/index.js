"use strict";
const childProc = require("child_process");
const CHILD_PROCESSES = 10;
const URL = 'https://www.trendbox.io';
const axios = require("axios");
const argv = require('minimist')(process.argv.slice(2));


(async () => {
  let times = [];
  let children = [];

  for (let i = 0; i < CHILD_PROCESSES; i++) {
    let childProcess = childProc.spawn("node", ["child.js", `--url=${URL}`])
    children.push(childProcess);
  }

  let responses = children.map(function wait(child) {
    return new Promise(function c(res) { 
      child.stdout.on('data', (data) => {
        times.push(parseInt(data));
        console.log(`child response time: ${data}`);
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
    console.log(`average: ${avg}`);
    console.log("success!");
  } else {
    console.log("failures!");
  }
})();
