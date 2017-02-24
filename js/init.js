(function($){
    $(function() {

        const HOST = '34.248.153.223';
        const PORT = '8989';
        const URL = 'http://' + HOST + ':' + PORT;

        var ubiId, redraw = false;

        transpose = function (a) {

            // Calculate the width and height of the Array
            var w = a.length ? a.length : 0,
                h = a[0] instanceof Array ? a[0].length : 0;

            // In case it is a zero matrix, no transpose routine needed.
            if (h === 0 || w === 0) {
                return [];
            }

            /**
             * @var {Number} i Counter
             * @var {Number} j Counter
             * @var {Array} t Transposed data is stored in this array.
             */
            var i, j, t = [];

            // Loop through every item in the outer array (height)
            for (i = 0; i < h; i++) {

                // Insert a new row (array)
                t[i] = [];

                // Loop through every item per item in outer array (width)
                for (j = 0; j < w; j++) {

                    // Save transposed data.
                    t[i][j] = a[j][i];
                }
            }

            return t;
        };

        // UI stuff
        populateUbiInfo = function(){
            $('#ubi-info').html('<div class="row" id="cp-heatmaps"> <h3 class="center">Component Planes</h3> </div> <div class="row" id="hit-umat-heatmap"> <h3 class="center">Hit-Histogram & U-Mat</h3> </div> <div class="row" id="prod-div-heatmap"> <h3 class="center">Product & Division</h3> </div>');
        };

        // UI stuff
        loadingAnimation = function(){
            $('#ubi-info').html('<div class="center" style="margin-top: 25%;"><div class="preloader-wrapper big active"> <div class="spinner-layer spinner-blue"> <div class="circle-clipper left"> <div class="circle"></div> </div><div class="gap-patch"> <div class="circle"></div> </div><div class="circle-clipper right"> <div class="circle"></div> </div> </div> <div class="spinner-layer spinner-red"> <div class="circle-clipper left"> <div class="circle"></div> </div><div class="gap-patch"> <div class="circle"></div> </div><div class="circle-clipper right"> <div class="circle"></div> </div> </div> <div class="spinner-layer spinner-yellow"> <div class="circle-clipper left"> <div class="circle"></div> </div><div class="gap-patch"> <div class="circle"></div> </div><div class="circle-clipper right"> <div class="circle"></div> </div> </div> <div class="spinner-layer spinner-green"> <div class="circle-clipper left"> <div class="circle"></div> </div><div class="gap-patch"> <div class="circle"></div> </div><div class="circle-clipper right"> <div class="circle"></div> </div> </div></div></div> ');
        };

        /**
         * Draws an heatmap for the given @input with the given @title in the given elemnt @elem
         * @param input - data to be plotted
         * @param title - title of the heatmap
         * @param elem - HTML element to append to
         */
        drawHeatmap = function (input, title, elem) {
            var values = [];
            for (i = 0; i < input.length; i += 20) {
                var res = [];
                for (k = 0; k < 20; k++)
                    res.push(input[i + k]);
                values.push(res);
            }
            var layout = {
                title: title,
                xaxis: {fixedrange: true},
                yaxis: {fixedrange: true},
                showlegend: false
            };
            var data = [
                {
                    z: transpose(values),
                    type: 'heatmap'
                }
            ];

            var myPlot = document.getElementById(elem);

            if(!redraw){
                Plotly.plot(elem, data, layout, {displayModeBar: false});

                myPlot.on('plotly_click', function (data) {
                    var infotext = data.points.map(function (d) {
                        console.log(d);
                        return ('x= ' + d.x + ' , y= ' + d.y + ', value=' + d.z);
                    });
                    console.log(infotext);
                });
            }
            else
                Plotly.newPlot(elem, data, layout, {displayModeBar: false});
        };

        var newUbi = {
            "width": 40,
            "height": 20,
            "dim": 2,
            "alpha_i": 0.1,
            "alpha_f": 0.08,
            "sigma_i": 0.6,
            "sigma_f": 0.2,
            "beta_value": 0.7,
            "normalization": {"type": "NONE"}
        };

        /**
         * Creates an UbiSOM instance  by sending a POST request
         */
        createUbi = function () {
            $.post(URL + '/ubis', JSON.stringify(newUbi))
                .done(function (data) {
                    ubiId = data.id;
                    loadingAnimation();
                    getUbiData(ubiId);
                });
        }

        /**
         * Deletes the UbiSOM instance by sending a DELETE request
         */
        deleteUbi = function() {
            $.ajax({
                url: URL + '/ubis/' + ubiId,
                type: 'DELETE',
                success: function(result) {
                    $('#ubi-info').html('<h4>Create a new UbiSOM</h4>');
                }
            });
        }

        /**
         * Sends data to the UbiSOM instance
         */
        patchUbiSOM = function (id) {
            $.getJSON('data/data_quad.json', function(json) {
                $.ajax({
                    url: URL + '/ubis/' + id,
                    type: 'PATCH',
                    processData: false,
                    contentType : 'application/json',
                    dataType: 'json',
                    error: function (e) {
                        if(e.status == 202){
                            Materialize.toast('Give me more!', 2500) // 4000 is the duration of the toast
                            console.log("feed ok");
                        }
                        else
                            console.log("patch error: " + e);
                    },
                    data: JSON.stringify(json)
                });
            });
        };

        //UI function
        feed = function() {
            patchUbiSOM(ubiId);
        };


        /**
         * Gets the UbiSOM instance underlying data
         */
        getUbiData = function(id) {
            $.getJSON(URL + '/ubis/' + id + '/data', function(json) {

                populateUbiInfo();

                var quad_data = json;

                var nrFeatures = quad_data.data[0].weights.length;
                var componentPlanes = [[]];
                var componentPlanesLabels = ['X','Y'];

                var hit = quad_data.data.map(function (d){ return d.hit_count});
                var umat = quad_data.data.map(function (d){ return d.distance});

                var prod = quad_data.data.map(function(d){return d.distance * (0.1 + d.hit_count)});
                var div = quad_data.data.map(function(d){return d.distance / (0.1 + d.hit_count)});

                for(i = 0; i < nrFeatures; i++)
                    componentPlanes[i] = quad_data.data.map(function(d){ return d.weights[i]});

                /** Draw Component Planes **/

                componentPlanes.forEach(function(cp,i){
                    $('#cp-heatmaps').append('<div class="col s12 m12 l6"><div id="cp-heatmap-' + i + '"></div></div>');
                    drawHeatmap(cp,componentPlanesLabels[i],'cp-heatmap-' + i);
                });

                /** Draw Hit-Histogram **/
                $('#hit-umat-heatmap').append('<div class="col s12 m12 l6"><div id="hit-histogram-heatmap"></div></div>');
                drawHeatmap(hit, 'Hit-Histogram', 'hit-histogram-heatmap');

                /** Draw UMat **/
                $('#hit-umat-heatmap').append('<div class="col s12 m12 l6"><div id="umat-heatmap"></div></div>');
                drawHeatmap(umat, 'U-Matrix', 'umat-heatmap');

                /** Draw Prod **/
                $('#prod-div-heatmap').append('<div class="col s12 m12 l6"><div id="prod-heatmap"></div></div>');
                drawHeatmap(prod, 'U-Mat * Hit', 'prod-heatmap');

                /** Draw Div **/
                $('#prod-div-heatmap').append('<div class="col s12 m12 l6"><div id="div-heatmap"></div></div>');
                drawHeatmap(div, 'U-Mat / Hit', 'div-heatmap');

                console.log("refresh");

            });
        };

        //UI function
        updateGraph = function(){
            redraw = true;
            loadingAnimation();
            getUbiData(ubiId);
        };

    }); // end of document ready
})(jQuery); // end of jQuery name space