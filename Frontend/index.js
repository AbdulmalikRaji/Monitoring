'use strict';
const url = 'https://cors-anywhere.herokuapp.com/https://webmonitoring-360209.ew.r.appspot.com/';


async function fetchText(url, place) {
  let response = await fetch(url);
  let data = await response.text();
  let visits = data.split('\n');
  console.log(visits);
  addVisits(visits, place);
  

}

async function fetchVisit(url) {
  let response = await fetch(url);
  let data = await response.json();
  let place = document.getElementById("place");
  place.innerText = 'Timestamp: '+data.timestamp + '\nResponse Duration: '+data.responseDuration + 'ms' + '\nConnection established successfully: '+data.successful;

  console.log(data);


}
   
function addVisits(visits, place){
    let list = document.getElementById(place);
    list.innerHTML = "";
          visits.forEach((item)=>{
          let li = document.createElement("li");
          li.innerText = item;
          list.appendChild(li);
          })
        } 

    

fetchText(url, "myList");
function Clicked1(){
  fetchText(url+'load', "load")
}
fetchVisit(url+'test');




