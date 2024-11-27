if (window.Vue) {
  Vue.component("st-pivottable", {
    name: "pivottable",
    template: `<div ref="pivotContainer"></div>`,

    props: {
      // Core Data
      dataset: { type: Array, required: true },
      
      // Layout
      rows: { type: Array, default: () => [] },
      cols: { type: Array, default: () => [] },
      vals: { type: Array, default: () => [] },
      
      // Aggregation & Rendering
      aggregators: { type: Object, default: () => window.jQuery.pivotUtilities.aggregators },
      aggregatorName: { type: String, default: "Count" },
      //renderers: { type: Object, default: () => window.jQuery.pivotUtilities.renderers },
      renderers: { type: Object, default: () =>{
         return $.extend(
          $.pivotUtilities.renderers, 
          $.pivotUtilities.plotly_renderers
        );
      } },
      
      rendererName: { type: String, default: "Table" },
      rendererOptions: { type: Object, default: () => ({}) },
      
      // Ordering
      colOrder: { type: String, default: "key_a_to_z" },
      rowOrder: { type: String, default: "key_a_to_z" },
      
      // Data Processing
      derivedAttributes: { type: Object, default: () => ({}) },
      filter: { type: Function, default: () => true },
      sorters: { type: [Object, Function], default: () => ({}) },
      
      // UI Configuration
      hiddenAttributes: { type: Array, default: () => [] },
      hiddenFromAggregators: { type: Array, default: () => [] },
      hiddenFromDragDrop: { type: Array, default: () => [] },
      menuLimit: { type: Number, default: 50 },
      autoSortUnusedAttrs: { type: Boolean, default: false },
      unusedAttrsVertical: { type: [Boolean, Number], default: 85 },
      showUI: { type: Boolean, default: true },
      
      // Filtering
      inclusions: { type: Object, default: () => ({}) },
      exclusions: { type: Object, default: () => ({}) },
      
      // Callbacks & Localization
      //onRefresh: { type: Function, default: () => {} },
      localeStrings: { type: Object, default: () => ({}) }
    },

    data() {
      return {
        editableFields: ['aggregatorName', 'rendererName', 'colOrder', 'rowOrder', 'cols', 'rows', 'vals'],
        pivotInstance: null, 
        pivotOptions: {
          rows: this.rows,
          cols: this.cols,
          vals: this.vals,
          aggregators: this.aggregators,
          aggregatorName: this.aggregatorName,
          renderers: this.renderers,
          rendererName: this.rendererName,
          rendererOptions: this.rendererOptions,
          colOrder: this.colOrder,
          rowOrder: this.rowOrder,
          derivedAttributes: this.derivedAttributes,
          filter: this.filter,
          sorters: this.sorters,
          hiddenAttributes: this.hiddenAttributes,
          hiddenFromAggregators: this.hiddenFromAggregators,
          hiddenFromDragDrop: this.hiddenFromDragDrop,
          menuLimit: this.menuLimit,
          autoSortUnusedAttrs: this.autoSortUnusedAttrs,
          unusedAttrsVertical: this.unusedAttrsVertical,
          showUI: this.showUI,
          inclusions: this.inclusions,
          exclusions: this.exclusions,
          onRefresh: this.handleRefresh,
          localeStrings: this.localeStrings
        }
      };
    },

    computed: {
      pivotProps() {
        return {
          rows: this.rows,
          cols: this.cols,
          vals: this.vals,
          aggregators: this.aggregators,
          aggregatorName: this.aggregatorName,
          renderers: this.renderers,
          rendererName: this.rendererName,
          rendererOptions: this.rendererOptions,
          colOrder: this.colOrder,
          rowOrder: this.rowOrder,
          derivedAttributes: this.derivedAttributes,
          filter: this.filter,
          sorters: this.sorters,
          hiddenAttributes: this.hiddenAttributes,
          hiddenFromAggregators: this.hiddenFromAggregators,
          hiddenFromDragDrop: this.hiddenFromDragDrop,
          menuLimit: this.menuLimit,
          autoSortUnusedAttrs: this.autoSortUnusedAttrs,
          unusedAttrsVertical: this.unusedAttrsVertical,
          showUI: this.showUI,
          inclusions: this.inclusions,
          exclusions: this.exclusions,
          onRefresh: this.handleRefresh,
          localeStrings: this.localeStrings
        };
      }
    },

    methods: {
      renderPivotTable() {
        if (!this.dataset) return;
        
        this.destroyPivotTable();
        console.log( 'renderPivotTable', this.pivotOptions );
        window.TESTER_PARAMS = { dataset: this.dataset, pivotOptions: this.pivotOptions };
        this.pivotInstance = window.jQuery(this.$refs.pivotContainer).pivotUI(
          this.dataset,
          this.pivotOptions
        );
      },
      
      destroyPivotTable() {
        console.log( 'destroyPivotTable?: ', this.pivotInstance? 'YES' : 'NO' );
        if (this.pivotInstance) {
          // Remove all event handlers and data
          window.jQuery(this.$refs.pivotContainer).off();
          // Remove all child elements
          window.jQuery(this.$refs.pivotContainer).empty();
          // Remove any data associated with the pivot table
          window.jQuery(this.$refs.pivotContainer).removeData();
          this.pivotInstance = null;
        }
      },

      handleRefresh(config) {
        console.log( 'handleRefresh 1', config );
       
        //this.$emit('refresh', config);
        for( let p in this.$props ) {
          if( this.editableFields.includes(p) ){
            let isArray = Array.isArray( config[p] );
            let valueChanged = isArray ? JSON.stringify( this.pivotOptions[p] ) !== JSON.stringify( config[p] ) : this.pivotOptions[p] !== config[p];
            if( valueChanged ) {
              this.pivotOptions[p] = config[p];
              console.log( 'handleRefresh 2: ', p, config[p], " (old: ", this.$props[p], ")" );
              this.$emit('update:'+p, config[p]);
              //this.$parent[p] = config[p];
            }
          }
        }

        //this.onRefresh(config);
      }, 

      onPropChanged() {
        console.log( 'onPropChanged', arguments );
        let somethingChanged = false;
        for( let p in this.pivotProps ) {
            if( this.pivotProps[p] !== this.pivotOptions[p] ) {
              somethingChanged = true;
              this.pivotOptions[p] = this.pivotProps[p];
            }
        }
        if( somethingChanged ) {
          this.renderPivotTable();
        }
      }, 
    },

    watch: {
      pivotProps: {
        handler: 'onPropChanged',
        deep: true
      }
    }, 

    mounted() {
      this.renderPivotTable();
    },

    beforeDestroy() {
      this.destroyPivotTable();
    }
  });
}