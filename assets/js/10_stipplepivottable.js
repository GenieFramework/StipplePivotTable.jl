if (window.Vue) {
  Vue.component("st-pivottable", {
    name: "pivottable",
    template: `
      <div>
        <div>Col Order: {{ colorder }}</div>
        <div>Row Order: {{ roworder }}</div>
        <div>Agg Name: {{ aggregatorname }}</div>
        <div>Agg Name: {{ aggregatorname }}</div>
        <div id="pivottable_output" style="overflow: auto;"></div>
      </div>`,

    props: {
      dataset: { type: Array, required: true },
      rows: { type: Array, required: true },
      cols: { type: Array, required: true },
      vals: { type: Array, required: true },
      aggregatorname: { type: String, required: false },
      renderername: { type: String, required: false },
      colorder: { type: String, required: false },
      roworder: { type: String, required: false },
    },

    mounted() {
      this.renderPivotTable();
    },

    methods: {
      renderPivotTable() {
        /* if(window.PIVOT_INSTANCE )
          window.PIVOT_INSTANCE.remove(); */
        console.log( 'renderPivotTable 00: ', this.colorder, " - ", this.roworder );
        if (this.dataset) {
          let options = {
            rows: this.rows,
            cols: this.cols,
            vals: this.vals,
            aggregatorName: this.aggregatorname,
            rendererName: this.renderername,
            colOrder: this.colorder,
            rowOrder: this.roworder
          };
          console.log( 'renderPivotTable', options );
          window.PIVOT_INSTANCE = $("#pivottable_output").pivotUI(
            this.dataset, options);
        }
      },

      updatePivotTable() {
        console.log( 'updatePivotTable' );
        // Destroy the existing instance if necessary
        //$("#pivottable_output").empty();
        this.renderPivotTable();
      },
    },

    watch: {
      dataset() {
        this.updatePivotTable();
      },
      rows() {
        this.updatePivotTable();
      },
      cols() {
        this.updatePivotTable();
      },
      vals() {
        this.updatePivotTable();
      },
      aggregatorname() {
        console.log( 'aggregatorname', this.aggregatorname );
        this.updatePivotTable();
      },
      renderername() {
        console.log( 'renderername', this.renderername );
        this.updatePivotTable();
      },
      colorder() {
        console.log( 'colorder', this.colorder );
        this.updatePivotTable();
      },
      roworder() {
        console.log( 'roworder', this.roworder );
        this.updatePivotTable();
      }
    },
  });
}
