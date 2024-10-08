if (window.Vue) {
  Vue.component("st-pivottable", {
    name: "pivottable",
    template: `
        <div>
          <div id="pivottable_output" style="overflow: auto;">
          </div>
        </div>`,
    
  
    props: {
      dataset:  { type: Array, required: true  }, 
      rows:  { type: Array, required: true  }, 
      cols:  { type: Array, required: true  }, 
      vals:  { type: Array, required: true  }, 
    },
  
    methods: {
      handleValueChange(event, newValue){
        window.Main_ReactiveModel.my_number = newValue;
      }, 
    },
  
    mounted() {
      if( this.dataset ){
        $("#pivottable_output").pivotUI(
          this.dataset, {
            rows: this.rows,
            cols: this.cols,
            vals: this.vals,
            /* rows: ["sex", "smoker"],
            cols: ["day", "time"],
            vals: ["tip", "total_bill"], */
            aggregatorName: "Sum over Sum",
            rendererName: "Heatmap"
          });
        }
    },
  
    computed: {
    },
  
    data() {
      return {
        dataset_test: [
          ["row","total_bill","tip","sex","smoker","day","time","size"],
          ["1",16.99,1.01,"Female","No","Sun","Dinner",2],
          ["2",10.34,1.66,"Male","No","Sun","Dinner",3],
          ["3",21.01,3.5,"Male","No","Sun","Dinner",3],
          ["4",23.68,3.31,"Male","No","Sun","Dinner",2],
          ["5",24.59,3.61,"Female","No","Sun","Dinner",4],
          ["6",25.29,4.71,"Male","No","Sun","Dinner",4],
          ["7",8.77,2,"Male","No","Sun","Dinner",2],
          ["8",26.88,3.12,"Male","No","Sun","Dinner",4],
          ["9",15.04,1.96,"Male","No","Sun","Dinner",2],
          ["10",14.78,3.23,"Male","No","Sun","Dinner",2],
          ["11",10.27,1.71,"Male","No","Sun","Dinner",2],
          ["12",35.26,5,"Female","No","Sun","Dinner",4],
          ["13",15.42,1.57,"Male","No","Sun","Dinner",2],
          ["14",18.43,3,"Male","No","Sun","Dinner",4],
          ["15",14.83,3.02,"Female","No","Sun","Dinner",2],
          ["16",21.58,3.92,"Male","No","Sun","Dinner",2],
          ["17",10.33,1.67,"Female","No","Sun","Dinner",3],
          ["18",16.29,3.71,"Male","No","Sun","Dinner",3],
          ["19",16.97,3.5,"Female","No","Sun","Dinner",3],
          ["20",20.65,3.35,"Male","No","Sat","Dinner",3],
          ["21",17.92,4.08,"Male","No","Sat","Dinner",2],
          ["22",20.29,2.75,"Female","No","Sat","Dinner",2],
          ["23",15.77,2.23,"Female","No","Sat","Dinner",2],
          ["24",39.42,7.58,"Male","No","Sat","Dinner",4],
          ["25",19.82,3.18,"Male","No","Sat","Dinner",2],
          ["26",17.81,2.34,"Male","No","Sat","Dinner",4],
          ["27",13.37,2,"Male","No","Sat","Dinner",2],
          ["28",12.69,2,"Male","No","Sat","Dinner",2],
          ["29",21.7,4.3,"Male","No","Sat","Dinner",2],
          ["30",19.65,3,"Female","No","Sat","Dinner",2],
          ["31",9.55,1.45,"Male","No","Sat","Dinner",2],
          ["32",18.35,2.5,"Male","No","Sat","Dinner",4],
          ["33",15.06,3,"Female","No","Sat","Dinner",2],
          ["34",20.69,2.45,"Female","No","Sat","Dinner",4],
          ["35",17.78,3.27,"Male","No","Sat","Dinner",2],
          ["36",24.06,3.6,"Male","No","Sat","Dinner",3],
          ["37",16.31,2,"Male","No","Sat","Dinner",3],
          ["38",16.93,3.07,"Female","No","Sat","Dinner",3],
          ["39",18.69,2.31,"Male","No","Sat","Dinner",3],
          ["40",31.27,5,"Male","No","Sat","Dinner",3],
          ["41",16.04,2.24,"Male","No","Sat","Dinner",3],
          ["42",17.46,2.54,"Male","No","Sun","Dinner",2],
          ["43",13.94,3.06,"Male","No","Sun","Dinner",2],
          ["44",9.68,1.32,"Male","No","Sun","Dinner",2],
          ["45",30.4,5.6,"Male","No","Sun","Dinner",4],
          ["46",18.29,3,"Male","No","Sun","Dinner",2],
          ["47",22.23,5,"Male","No","Sun","Dinner",2],
          ["48",32.4,6,"Male","No","Sun","Dinner",4],
          ["49",28.55,2.05,"Male","No","Sun","Dinner",3],
          ["50",18.04,3,"Male","No","Sun","Dinner",2],
          ["51",12.54,2.5,"Male","No","Sun","Dinner",2],
          ["52",10.29,2.6,"Female","No","Sun","Dinner",2],
          ["53",34.81,5.2,"Female","No","Sun","Dinner",4],
          ["54",9.94,1.56,"Male","No","Sun","Dinner",2],
          ["55",25.56,4.34,"Male","No","Sun","Dinner",4],
          ["56",19.49,3.51,"Male","No","Sun","Dinner",2],
          ["57",38.01,3,"Male","Yes","Sat","Dinner",4],
          ["58",26.41,1.5,"Female","No","Sat","Dinner",2],
          ["59",11.24,1.76,"Male","Yes","Sat","Dinner",2],
          ["60",48.27,6.73,"Male","No","Sat","Dinner",4],
          ["61",20.29,3.21,"Male","Yes","Sat","Dinner",2],
          ["62",13.81,2,"Male","Yes","Sat","Dinner",2],
          ["63",11.02,1.98,"Male","Yes","Sat","Dinner",2],
          ["64",18.29,3.76,"Male","Yes","Sat","Dinner",4],
          ["65",17.59,2.64,"Male","No","Sat","Dinner",3],
          ["66",20.08,3.15,"Male","No","Sat","Dinner",3],
          ["67",16.45,2.47,"Female","No","Sat","Dinner",2],
          ["68",3.07,1,"Female","Yes","Sat","Dinner",1],
          ["69",20.23,2.01,"Male","No","Sat","Dinner",2],
          ["70",15.01,2.09,"Male","Yes","Sat","Dinner",2],
          ["71",12.02,1.97,"Male","No","Sat","Dinner",2],
          ["72",17.07,3,"Female","No","Sat","Dinner",3],
          ["73",26.86,3.14,"Female","Yes","Sat","Dinner",2],
          ["74",25.28,5,"Female","Yes","Sat","Dinner",2],
          ["75",14.73,2.2,"Female","No","Sat","Dinner",2],
          ["76",10.51,1.25,"Male","No","Sat","Dinner",2],
          ["77",17.92,3.08,"Male","Yes","Sat","Dinner",2],
          ["78",27.2,4,"Male","No","Thur","Lunch",4],
          ["79",22.76,3,"Male","No","Thur","Lunch",2],
          ["80",17.29,2.71,"Male","No","Thur","Lunch",2],
          ["81",19.44,3,"Male","Yes","Thur","Lunch",2],
          ["82",16.66,3.4,"Male","No","Thur","Lunch",2],
          ["83",10.07,1.83,"Female","No","Thur","Lunch",1],
          ["84",32.68,5,"Male","Yes","Thur","Lunch",2],
          ["85",15.98,2.03,"Male","No","Thur","Lunch",2],
          ["86",34.83,5.17,"Female","No","Thur","Lunch",4],
          ["87",13.03,2,"Male","No","Thur","Lunch",2],
          ["88",18.28,4,"Male","No","Thur","Lunch",2],
          ["89",24.71,5.85,"Male","No","Thur","Lunch",2],
          ["90",21.16,3,"Male","No","Thur","Lunch",2],
          ["91",28.97,3,"Male","Yes","Fri","Dinner",2],
          ["92",22.49,3.5,"Male","No","Fri","Dinner",2],
          ["93",5.75,1,"Female","Yes","Fri","Dinner",2],
          ["94",16.32,4.3,"Female","Yes","Fri","Dinner",2],
          ["95",22.75,3.25,"Female","No","Fri","Dinner",2],
          ["96",40.17,4.73,"Male","Yes","Fri","Dinner",4],
          ["97",27.28,4,"Male","Yes","Fri","Dinner",2],
          ["98",12.03,1.5,"Male","Yes","Fri","Dinner",2],
          ["99",21.01,3,"Male","Yes","Fri","Dinner",2],
          ["100",12.46,1.5,"Male","No","Fri","Dinner",2],
          ["101",11.35,2.5,"Female","Yes","Fri","Dinner",2],
          ["102",15.38,3,"Female","Yes","Fri","Dinner",2],
          ["103",44.3,2.5,"Female","Yes","Sat","Dinner",3],
          ["104",22.42,3.48,"Female","Yes","Sat","Dinner",2],
          ["105",20.92,4.08,"Female","No","Sat","Dinner",2],
          ["106",15.36,1.64,"Male","Yes","Sat","Dinner",2],
          ["107",20.49,4.06,"Male","Yes","Sat","Dinner",2],
          ["108",25.21,4.29,"Male","Yes","Sat","Dinner",2],
          ["109",18.24,3.76,"Male","No","Sat","Dinner",2],
          ["110",14.31,4,"Female","Yes","Sat","Dinner",2],
          ["111",14,3,"Male","No","Sat","Dinner",2],
          ["112",7.25,1,"Female","No","Sat","Dinner",1],
          ["113",38.07,4,"Male","No","Sun","Dinner",3],
          ["114",23.95,2.55,"Male","No","Sun","Dinner",2],
          ["115",25.71,4,"Female","No","Sun","Dinner",3],
          ["116",17.31,3.5,"Female","No","Sun","Dinner",2],
          ["117",29.93,5.07,"Male","No","Sun","Dinner",4],
          ["118",10.65,1.5,"Female","No","Thur","Lunch",2],
          ["119",12.43,1.8,"Female","No","Thur","Lunch",2],
          ["120",24.08,2.92,"Female","No","Thur","Lunch",4],
          ["121",11.69,2.31,"Male","No","Thur","Lunch",2],
          ["122",13.42,1.68,"Female","No","Thur","Lunch",2],
          ["123",14.26,2.5,"Male","No","Thur","Lunch",2],
          ["124",15.95,2,"Male","No","Thur","Lunch",2],
          ["125",12.48,2.52,"Female","No","Thur","Lunch",2],
          ["126",29.8,4.2,"Female","No","Thur","Lunch",6],
          ["127",8.52,1.48,"Male","No","Thur","Lunch",2],
          ["128",14.52,2,"Female","No","Thur","Lunch",2],
          ["129",11.38,2,"Female","No","Thur","Lunch",2],
          ["130",22.82,2.18,"Male","No","Thur","Lunch",3],
          ["131",19.08,1.5,"Male","No","Thur","Lunch",2],
          ["132",20.27,2.83,"Female","No","Thur","Lunch",2],
          ["133",11.17,1.5,"Female","No","Thur","Lunch",2],
          ["134",12.26,2,"Female","No","Thur","Lunch",2],
          ["135",18.26,3.25,"Female","No","Thur","Lunch",2],
          ["136",8.51,1.25,"Female","No","Thur","Lunch",2],
          ["137",10.33,2,"Female","No","Thur","Lunch",2],
          ["138",14.15,2,"Female","No","Thur","Lunch",2],
          ["139",16,2,"Male","Yes","Thur","Lunch",2],
          ["140",13.16,2.75,"Female","No","Thur","Lunch",2],
          ["141",17.47,3.5,"Female","No","Thur","Lunch",2],
          ["142",34.3,6.7,"Male","No","Thur","Lunch",6],
          ["143",41.19,5,"Male","No","Thur","Lunch",5],
          ["144",27.05,5,"Female","No","Thur","Lunch",6],
          ["145",16.43,2.3,"Female","No","Thur","Lunch",2],
          ["146",8.35,1.5,"Female","No","Thur","Lunch",2],
          ["147",18.64,1.36,"Female","No","Thur","Lunch",3],
          ["148",11.87,1.63,"Female","No","Thur","Lunch",2],
          ["149",9.78,1.73,"Male","No","Thur","Lunch",2],
          ["150",7.51,2,"Male","No","Thur","Lunch",2],
          ["151",14.07,2.5,"Male","No","Sun","Dinner",2],
          ["152",13.13,2,"Male","No","Sun","Dinner",2],
          ["153",17.26,2.74,"Male","No","Sun","Dinner",3],
          ["154",24.55,2,"Male","No","Sun","Dinner",4],
          ["155",19.77,2,"Male","No","Sun","Dinner",4],
          ["156",29.85,5.14,"Female","No","Sun","Dinner",5],
          ["157",48.17,5,"Male","No","Sun","Dinner",6],
          ["158",25,3.75,"Female","No","Sun","Dinner",4],
          ["159",13.39,2.61,"Female","No","Sun","Dinner",2],
          ["160",16.49,2,"Male","No","Sun","Dinner",4],
          ["161",21.5,3.5,"Male","No","Sun","Dinner",4],
          ["162",12.66,2.5,"Male","No","Sun","Dinner",2],
          ["163",16.21,2,"Female","No","Sun","Dinner",3],
          ["164",13.81,2,"Male","No","Sun","Dinner",2],
          ["165",17.51,3,"Female","Yes","Sun","Dinner",2],
          ["166",24.52,3.48,"Male","No","Sun","Dinner",3],
          ["167",20.76,2.24,"Male","No","Sun","Dinner",2],
          ["168",31.71,4.5,"Male","No","Sun","Dinner",4],
          ["169",10.59,1.61,"Female","Yes","Sat","Dinner",2],
          ["170",10.63,2,"Female","Yes","Sat","Dinner",2],
          ["171",50.81,10,"Male","Yes","Sat","Dinner",3],
          ["172",15.81,3.16,"Male","Yes","Sat","Dinner",2],
          ["173",7.25,5.15,"Male","Yes","Sun","Dinner",2],
          ["174",31.85,3.18,"Male","Yes","Sun","Dinner",2],
          ["175",16.82,4,"Male","Yes","Sun","Dinner",2],
          ["176",32.9,3.11,"Male","Yes","Sun","Dinner",2],
          ["177",17.89,2,"Male","Yes","Sun","Dinner",2],
          ["178",14.48,2,"Male","Yes","Sun","Dinner",2],
          ["179",9.6,4,"Female","Yes","Sun","Dinner",2],
          ["180",34.63,3.55,"Male","Yes","Sun","Dinner",2],
          ["181",34.65,3.68,"Male","Yes","Sun","Dinner",4],
          ["182",23.33,5.65,"Male","Yes","Sun","Dinner",2],
          ["183",45.35,3.5,"Male","Yes","Sun","Dinner",3],
          ["184",23.17,6.5,"Male","Yes","Sun","Dinner",4],
          ["185",40.55,3,"Male","Yes","Sun","Dinner",2],
          ["186",20.69,5,"Male","No","Sun","Dinner",5],
          ["187",20.9,3.5,"Female","Yes","Sun","Dinner",3],
          ["188",30.46,2,"Male","Yes","Sun","Dinner",5],
          ["189",18.15,3.5,"Female","Yes","Sun","Dinner",3],
          ["190",23.1,4,"Male","Yes","Sun","Dinner",3],
          ["191",15.69,1.5,"Male","Yes","Sun","Dinner",2],
          ["192",19.81,4.19,"Female","Yes","Thur","Lunch",2],
          ["193",28.44,2.56,"Male","Yes","Thur","Lunch",2],
          ["194",15.48,2.02,"Male","Yes","Thur","Lunch",2],
          ["195",16.58,4,"Male","Yes","Thur","Lunch",2],
          ["196",7.56,1.44,"Male","No","Thur","Lunch",2],
          ["197",10.34,2,"Male","Yes","Thur","Lunch",2],
          ["198",43.11,5,"Female","Yes","Thur","Lunch",4],
          ["199",13,2,"Female","Yes","Thur","Lunch",2],
          ["200",13.51,2,"Male","Yes","Thur","Lunch",2],
          ["201",18.71,4,"Male","Yes","Thur","Lunch",3],
          ["202",12.74,2.01,"Female","Yes","Thur","Lunch",2],
          ["203",13,2,"Female","Yes","Thur","Lunch",2],
          ["204",16.4,2.5,"Female","Yes","Thur","Lunch",2],
          ["205",20.53,4,"Male","Yes","Thur","Lunch",4],
          ["206",16.47,3.23,"Female","Yes","Thur","Lunch",3],
          ["207",26.59,3.41,"Male","Yes","Sat","Dinner",3],
          ["208",38.73,3,"Male","Yes","Sat","Dinner",4],
          ["209",24.27,2.03,"Male","Yes","Sat","Dinner",2],
          ["210",12.76,2.23,"Female","Yes","Sat","Dinner",2],
          ["211",30.06,2,"Male","Yes","Sat","Dinner",3],
          ["212",25.89,5.16,"Male","Yes","Sat","Dinner",4],
          ["213",48.33,9,"Male","No","Sat","Dinner",4],
          ["214",13.27,2.5,"Female","Yes","Sat","Dinner",2],
          ["215",28.17,6.5,"Female","Yes","Sat","Dinner",3],
          ["216",12.9,1.1,"Female","Yes","Sat","Dinner",2],
          ["217",28.15,3,"Male","Yes","Sat","Dinner",5],
          ["218",11.59,1.5,"Male","Yes","Sat","Dinner",2],
          ["219",7.74,1.44,"Male","Yes","Sat","Dinner",2],
          ["220",30.14,3.09,"Female","Yes","Sat","Dinner",4],
          ["221",12.16,2.2,"Male","Yes","Fri","Lunch",2],
          ["222",13.42,3.48,"Female","Yes","Fri","Lunch",2],
          ["223",8.58,1.92,"Male","Yes","Fri","Lunch",1],
          ["224",15.98,3,"Female","No","Fri","Lunch",3],
          ["225",13.42,1.58,"Male","Yes","Fri","Lunch",2],
          ["226",16.27,2.5,"Female","Yes","Fri","Lunch",2],
          ["227",10.09,2,"Female","Yes","Fri","Lunch",2],
          ["228",20.45,3,"Male","No","Sat","Dinner",4],
          ["229",13.28,2.72,"Male","No","Sat","Dinner",2],
          ["230",22.12,2.88,"Female","Yes","Sat","Dinner",2],
          ["231",24.01,2,"Male","Yes","Sat","Dinner",4],
          ["232",15.69,3,"Male","Yes","Sat","Dinner",3],
          ["233",11.61,3.39,"Male","No","Sat","Dinner",2],
          ["234",10.77,1.47,"Male","No","Sat","Dinner",2],
          ["235",15.53,3,"Male","Yes","Sat","Dinner",2],
          ["236",10.07,1.25,"Male","No","Sat","Dinner",2],
          ["237",12.6,1,"Male","Yes","Sat","Dinner",2],
          ["238",32.83,1.17,"Male","Yes","Sat","Dinner",2],
          ["239",35.83,4.67,"Female","No","Sat","Dinner",3],
          ["240",29.03,5.92,"Male","No","Sat","Dinner",3],
          ["241",27.18,2,"Female","Yes","Sat","Dinner",2],
          ["242",22.67,2,"Male","Yes","Sat","Dinner",2],
          ["243",17.82,1.75,"Male","No","Sat","Dinner",2],
          ["244",18.78,3,"Female","No","Thur","Dinner",2]
          ]
      };
    },
  });
} else {
  console.warn("Can't register custom component because Vue is not available");
}
