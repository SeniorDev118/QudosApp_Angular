(function () {
    'use strict';
    angular.module('BlurAdmin.pages.livetracking')
        .controller('livetrackingCtrl', livetrackingCtrl)
    function livetrackingCtrl($timeout, $mdSidenav, $log, $rootScope, $scope, $http, MY_CONSTANT, ngDialog, $state, $filter, socketFactory, toastr, $window, $interval) {

        var rightPanelInterval;

        $rootScope.showloader = false;
        $scope.expand = 1;
        $scope.showim = 0;
        $scope.select = {};

        //socket init
        var token = localStorage.getItem('access_token');
        // console.log(token);
        socketFactory.init();
        // console.log('$window.socket',$window.socket)
        $window.socket.emit('auth', {user_type: 'admin', access_token: token});

        $scope.check = function (id) {
            // console.log(id);
            var ids = 'object-' + id;
            // console.log(ids);
            $scope.showim = !$scope.showim;
            // console.log($scope.showim);
            if ($scope.showim == '0') {
                // console.log("Working");
                $scope.collapseDisc();

            }
        }
        $scope.togRight = function (daa) {
            // console.log(daa);
            ngDialog.open({
                template: 'driverDetails',
                className: 'ngdialog-theme-default',
                //showClose: false,
                scope: $scope
            });
            $scope.driver_image = daa.driver_image;
            $scope.driver_mobile = daa.driver_mobile;
            $scope.driver_name = daa.driver_name;
            $scope.driver_email = daa.driver_email;
            $scope.device_name = daa.device_name;
            $scope.car_name = daa.car_name;
            $scope.car_no = daa.car_no;
        }

        $scope.expandDisc = function (daa) {
            $('#expandedDiv').css("transform", "translate(92.5%)");
            $('#expandedDiv').css("transition", "1s");
            $('#expandedDiv').css("left", "36px");
            //Trip_Detail
            if (daa.pickup_location_address) {
                $scope.pickup_location_address = daa.pickup_location_address;
            } else if (daa.address) {
                $scope.pickup_location_address = daa.address;
            }
            $scope.manual_destination_address = daa.manual_destination_address;
            // if (daa.driver_name) {
                $scope.driver_name = daa.driver_name;
            // } else if (daa.user_name) {
                // $scope.driver_name = daa.user_name;
            // }
            $scope.car_name = daa.car_name;
            $scope.driver_mobile = daa.driver_mobile;
            if (daa.fare_calculated) {
                $scope.fare_calculated = "$" + daa.fare_calculated;
            } else {
                $scope.fare_calculated = "Unavailable";
            }
            // if (daa.hasOwnProperty("fare_calculated"));
            // {
            //     $scope.fare_calculated = "$" + daa.fare_calculated;
            // }
            // if (daa.hasOwnProperty("daa.fare_calculated") == false);
            // {
            //     $scope.fare_calculated = "Unavailable";
            // }
            if (daa.hasOwnProperty("session_id")) {
                $scope.tripnumber = "Trip Number: #" + daa.session_id;
            }
            if (daa.hasOwnProperty("session_id") == false) {
                $scope.tripnumber = "Trip Number:Unavailable";
            }

            //Customer
            $scope.user_name = daa.user_name;
            $scope.user_id = daa.user_id;
            $scope.user_rating = daa.user_rating;
            $scope.user_mobile = daa.user_mobile;
            $scope.user_email = daa.user_email;
            $scope.user_image = daa.user_image;

            //History
            if (daa.pickup_id) {
                var scheduledrides_history = $scope.scheduledrides;
                let schhistory = [];
                for (let ride_history of scheduledrides_history) {
                    if (daa.user_id == ride_history.user_id) {
                        ride_history = {...ride_history}
                        schhistory.push(ride_history);
                    } else {
                        continue;
                    }
                }
                $scope.rideshistory = schhistory;
            } else if (daa.session_id) {
                var completedrides_history = $scope.completedrides;
                var total = 0;
                let comhistory = [];
                for (let ride_history of completedrides_history) {
                    if (daa.driver_id == ride_history.driver_id) {
                        ride_history = {...ride_history}
                        comhistory.push(ride_history);
                        total = total + ride_history.fare_calculated;
                    } else {
                        continue;
                    }
                }
                // console.log("----history", comhistory);
                // console.log("----total", total);
                $scope.rideshistory = comhistory;
                $scope.faretotal = total;
            } 

            // if (daa.pickup_time) {
            //     $scope.data_time = daa.pickup_time;
            // } else if(daa.drop_time) {
            //     $scope.data_time = daa.drop_time;
            // } else {
            //     $scope.data_time = 'Unavailable';
            // }
            // if (daa.address) {
            //     $scope.pickup = daa.address;
            // } else if (daa.pickup_location_address) {
            //     $scope.pickup = daa.pickup_location_address;
            // } else {
            //     $scope.pickup = 'Unavailable';
            // }
            // $scope.dropoff = daa.manual_destination_address;
            // $scope.fare = daa.faredata;
        }
        $scope.collapseDisc = function () {
            $scope.expand = 1;
            // $('#mapCustom').css("margin-left","18%");
            $('#mapCustom').addClass('col-lg-12');
            $('#expandedDiv').css("transform", "translate(-200%)");
            $('#expandedDiv').css("transition", "1s");

        }

 

        var markers = [];
        var ongoingDriverIds = [];
        //var location = {lat: 30,lng: 50}
        function move (driverMarker, wait) {
            if(driverMarker.path.length > 0) {
                driverMarker.isMoving = true;
                driverMarker.marker.setPosition(driverMarker.path[0][0]);
                let url = driverMarker.marker.getIcon().url;
                var markerImg = document.querySelector(`img[src="${url}"]`);
                if (markerImg) {
                    var deg = driverMarker.path[0][1];
                    markerImg.style.transform = 'rotate(' + deg + 'deg)'
                }
                driverMarker.path.splice(0, 1);
                setTimeout(function() {
                    move(driverMarker, wait); 
                }, wait);
                let icon = driverMarker.marker.getIcon();
                driverMarker.marker.setIcon(icon);
            } else {
                driverMarker.isMoving = false;
            }
        }
    
        function setMarker (driverData, { image, infowindow, rotation }){
            var driverMarker = _.find(markers,{'driver_id':driverData.driver_id});
            var location = new google.maps.LatLng(driverData.current_location_latitude , driverData.current_location_longitude);
            var marker;
            if(driverMarker) {
                let prevPos = driverMarker.marker.getPosition();
                if (driverMarker.path.length > 0) {
                    prevPos = driverMarker.path[driverMarker.path.length - 1][0];
                }
                let icon = driverMarker.marker.getIcon();
                icon.url = image.url;
                driverMarker.marker.setIcon(icon)
    
                var rotation = google.maps.geometry.spherical.computeHeading(prevPos, location);
                let fromLat = prevPos.lat();
                let fromLng = prevPos.lng();
                let toLat = location.lat();
                let toLng = location.lng();
                if (fromLat != toLat || fromLng != toLng) {
                    let diff = Date.now() - driverMarker.time;
                    driverMarker.time = Date.now();
                    let frames = driverMarker.path;
                    let hasPath = false;
                    if (frames.length > 0) {
                        hasPath = true;
                    }
                    if (diff > 2000 ) {
                        diff = 1000;
                    }
                    if (frames.length >= 100) {
                        frames = []
                    }

 
                    for (var percent = 0; percent < 1; percent += 0.01) {
                        let curLat = fromLat + percent * (toLat - fromLat);
                        let curLng = fromLng + percent * (toLng - fromLng);
                        frames.push([new google.maps.LatLng(curLat, curLng), rotation]);
                    }
                    driverMarker.path = frames;
                    if (!hasPath) {
                        move(driverMarker, diff / 100);
                    } else if (!driverMarker.isMoving) {
                        move(driverMarker, diff / 100);
                    } else {
                        move(driverMarker, 0.5);
                    }
                } 
                marker = driverMarker.marker;
            }else{
                marker = new google.maps.Marker({
                    position: location,
                    icon: image,
                    map: map,
                    infoWindow: infowindow,
                });
                marker.addListener('click', function (e) {
                    marker.infoWindow.open(map, this);
                });
                // $("div.gm-style-iw + div").bind('click', function() {
                //     console.log('User click X');
                // });
                new google.maps.event.trigger( marker, 'click' );
                markers.push({
                    driver_id:driverData.driver_id,
                    marker: marker,
                    time: Date.now(),
                    path: [],
                    isMoving: false,
                });
                setTimeout(function() {
                    var contentDiv = $('.gm-style-iw');
                    contentDiv.next('div').hide();
                    contentDiv.prev('div.custom-close').remove();
                    var closeBtn =
                        `<div class="custom-close" id="${driverData.driver_id}">
                            <img alt="" src="https://maps.gstatic.com/mapfiles/api-3/images/mapcnt6.png" draggable="false" style="position: absolute; left: -2px; top: -336px; width: 59px; height: 492px; user-select: none; border: 0px; padding: 0px; margin: 0px; max-width: none;">
                        </div>`;
                    $(closeBtn).insertBefore(contentDiv)
                    $('div.custom-close').bind('click', function(e) {
                        $(e.target).parent().parent().css({opacity: 0})
                    });
                });
            }
            return marker;
        }



        /*--- Right Side Detail Panel STARTS--*/
        $scope.expand1 = 1;
        var rotation = 0;

        // Sockets Implementation Start Here.
        socketFactory.on('auth', function(data) {
            //console.log('datadata', data);

            socketFactory.emit('counterRides', {action: 0, region_id:0});
            socketFactory.emit('ongoingRides', {action: 0, region_id:0});
            socketFactory.emit('completedScheduleRides', {action: 0, region_id:0});
            socketFactory.emit('completedRides', {action: 0, region_id:0, limit:5});
            socketFactory.emit('scheduledRides', {action: 0, region_id:0});
            socketFactory.emit('availableDrivers', {offset:0,limit:10,action:0});
            socketFactory.emit('busyDrivers', {offset:0,limit:10,action:0});
            socketFactory.emit('offlineDrivers', {offset:0,limit:10,action:0});
            //socketFactory.emit('allDrivers', {offset:0,limit:10,action:0});

            if(data[0].flag==true)
            {
                $interval(function(){
                    socketFactory.emit('counterRides', {action: 0, region_id:0});
                    socketFactory.emit('ongoingRides', {action: 0, region_id:0});
                    socketFactory.emit('completedScheduleRides', {action: 0, region_id:0});
                    socketFactory.emit('completedRides', {action: 0, region_id:0, limit:5});
                    socketFactory.emit('scheduledRides', {action: 0, region_id:0});
                    socketFactory.emit('availableDrivers', {offset:0,limit:10,action:0});
                    socketFactory.emit('busyDrivers', {offset:0,limit:10,action:0});
                    socketFactory.emit('offlineDrivers', {offset:0,limit:10,action:0});
                    //socketFactory.emit('allDrivers', {offset:0,limit:10,action:0});
                },2000)

                socketFactory.on('counterRides', function(data) {
                    // console.log('datadatadatadatadatadata', data);
                    $scope.sock1=data[0].data;
                    $scope.totalItemsOngoing=$scope.sock1.ONGOING;
                    $scope.totalItemsScheduled=$scope.sock1.SCHEDULED;
                    $scope.totalItemsCompleted=$scope.sock1.COMPLETED;
                });

                socketFactory.on('ongoingRides', function(data) {
                    // let history = [];
                    // for (let i = 1; i <= 4; i++) {
                    //     if (i == 2 | i == 3) {
                    //         continue;
                    //     } else {
                    //         for (let ride of data[0].data.paginated_rides) {
                    //             if (i <= ride.ride_status) {
                    //                 ride = {...ride}
                    //                 ride.ride_status = i;
                    //                 history.push(ride);
                    //             }
                    //         }
                    //     }
                    // }
                    // console.log(data[0].data.paginated_rides);
                    // console.log("---------ongoing", data[0].data.paginated_rides);
                    // $scope.onGoingRidePag = history;
                    $scope.onGoingRidePag = data[0].data.paginated_rides;
                    $scope.onGoingRidePag.map(ride => {
                        if (ride.driver_image) {
                            ride.driver_image = ride.driver_image.replace('http://', 'https://');
                        }
                    })
                });
                
                socketFactory.on('completedRides', function(data) {
                    $scope.sockoc=data[0].data.paginated_rides;
                    $scope.completedRides=$scope.sockoc;
                });

                socketFactory.on('completedScheduleRides', function(data) {
                    var compare = function(a, b) {
                        return new Date(b.pickup_time) - new Date(a.pickup_time);
                    }
                    var comparecompleted = function(a, b) {
                        return new Date(b.start_time) - new Date(a.start_time);
                    }
                    var completedrides = data[0].data.COMPLETED;
                    completedrides.sort(comparecompleted);
                    var scheduledrides = data[0].data.SCHEDULED;
                    scheduledrides.sort(compare);
                    if ($scope.scheduledrides && $scope.scheduledrides.length > 0) {
                        return;
                    }
                    $scope.completedrides = completedrides;
                    $scope.completedrides.map(ride => {
                        if (ride.driver_image) {
                            ride.driver_image = ride.driver_image.replace('http://', 'https://');
                        }
                    })
                    $scope.scheduledrides = scheduledrides;
                    // console.log("--------------completed", completedrides);
                    // console.log("--------------scheduled", scheduledrides);
                    // console.log(JSON.stringify(scheduledrides))
                });
                  
                  
                socketFactory.on('scheduledRides', function(data) {
                    $scope.sockos=data[0].data.paginated_schedules;
                    $scope.scheduled_rides=$scope.sockos;

                    $scope.p=new Array();
                    _.each($scope.sockos,function(key,value){
                        $scope.p.push(_.pick(key,'pickup_latitude','pickup_longitude'));
                    });
                    var image = {
                        url: 'assets/img/intransit_pickup.png', // image is 512 x 512
                        scaledSize: new google.maps.Size(13, 22)
                    };
                    for(var i=0; i<$scope.p.length; i++){
                        var position = new google.maps.LatLng($scope.p[i].pickup_latitude , $scope.p[i].pickup_longitude);
                        bounds.extend(position);
                        $scope.marker1 = new google.maps.Marker({
                            position: position,
                            icon:image,
                            map: map,
                        });

                    }

                    $scope.d=new Array();
                    _.each($scope.sockos,function(key,value){
                        $scope.d.push(_.pick(key,'manual_destination_latitude','manual_destination_longitude'));
                    });
                    console.log('Des',$scope.d);

                    var image = {
                        url: 'assets/img/assigned_delivery.png',
                        scaledSize: new google.maps.Size(13, 22),
                    };
                    for(var i=0; i<$scope.d.length; i++){
                        var position = new google.maps.LatLng($scope.d[i].manual_destination_latitude , $scope.d[i].manual_destination_longitude);
                        bounds.extend(position);
                        $scope.marker2 = new google.maps.Marker({
                            position: position,
                            icon:image,
                            map: map,
                        });
                    }
                });
                // Drivers_Sockets
                
                
                socketFactory.on('availableDrivers', function(data) {
                    $scope.avail = data[0].data.paginated_drivers;
                    // console.log('--------------available',$scope.avail[1]);
                    
                    if($scope.select.selectedIndex == 3) { //} || $scope.select.selectedIndex == 3) { // for available and all
                    // var url = 'assets/img/driver_idle.svg';
                    // var urlGoing = 'assets/img/driver_intransit.svg';
                    var url;
                    var urlGoing;
                    var image = {
                        url: url,
                        scaledSize: new google.maps.Size(33, 33),
                        anchor: new google.maps.Point(16.5, 16.5)
                    };
                    
                    $scope.avl = new Array();
                    _.each($scope.avail, function (key, value) {
                        $scope.avl.push(_.pick(key, 'current_location_latitude', 'current_location_longitude'));
                    });
                    //console.log('Driver Data',$scope.l);
                    for (var i = 0; i < $scope.avl.length; i++) {
                        if($scope.avail[i].car_type == 2) {
                            url = 'assets/carTypeImage/QLE/3_White_QLE.svg';
                            urlGoing = 'assets/carTypeImage/QLE/2_Blue_QLE.svg';
                        } else if($scope.avail[i].car_type == 1) {
                            url = 'assets/img/driver_idle.svg';
                            urlGoing = 'assets/img/driver_intransit.svg';
                        } else if($scope.avail[i].car_type == 3) {
                            url = 'assets/carTypeImage/LUXE/3_White_LUXE.svg';
                            urlGoing = 'assets/carTypeImage/LUXE/2_Blue_LUXE.svg';
                        } else if($scope.avail[i].car_type == 4) {
                            url = 'assets/carTypeImage/Grande/3_White_Grande.svg';
                            urlGoing = 'assets/carTypeImage/Grande/2_Blue_Grande.svg';
                        }
                        var infowindow = new google.maps.InfoWindow({
                            content: "<div id='" + $scope.avail[i].driver_id + "' style='font-size: 9px;'>" +
                            "<span>Name</span> : <span>" + $scope.avail[i].driver_name + "</span><br>" +
                            "<span>Email</span> : <span>" + $scope.avail[i].driver_email + "</span><br>" +
                            "<span>Mobile</span> : <span>" + $scope.avail[i].driver_mobile + "</span>" +
                            "</div>",
                            disableAutoPan: true
                        });
                        image.url = `${url}#${$scope.avail[i].driver_id}`;
                        if (ongoingDriverIds.includes($scope.avail[i].driver_id)) {
                            image.url = `${urlGoing}#${$scope.avail[i].driver_id}`;
                        }
                        setMarker($scope.avail[i], { image, infowindow, rotation })
                        //map.panTo(marker.position);
                        // marker.addListener('click', function () {
                            //     this.infoWindow.open(map, this);
                            // });
                        }
                        //rotation = rotation >= 360 ? 0 : rotation + 10;
                    }
                });

                socketFactory.on('ongoingRides', function(data) {
                    $scope.busy = data[0].data.paginated_rides;
                    var ids = [];
                    for (let paginated_ride of $scope.busy) {
                        ids.push(paginated_ride.driver_id);
                    }
                    ongoingDriverIds = ids;
                        //console.log("BUSY",$scope.busy);
                    // if($scope.busy.is_accepted == 1) {
                        
                    // }
                    // if($scope.select.selectedIndex == 1) { //|| $scope.select.selectedIndex == 3){ // for busy and all
                    if($scope.select.selectedIndex == 1 || $scope.select.selectedIndex == 3){ // for busy and all
                        // var url = 'assets/img/driver_intransit.svg';
                        var url;
                        var image = {
                            url: url, // image is 512 x 512
                            scaledSize: new google.maps.Size(33, 33),
                            anchor: new google.maps.Point(16.5, 16.5)
                        };
                        $scope.bzy = new Array();
                        //var bounds = new google.maps.LatLngBounds();
                        _.each($scope.busy, function (key, value) {
                            $scope.bzy.push(_.pick(key, 'current_location_latitude', 'current_location_longitude'));
                        });
                        //console.log(' buzy dri', $scope.bzy);
                        for (var i = 0; i < $scope.busy.length; i++) {
                            if($scope.busy[i].car_type == 2) {
                                url = 'assets/carTypeImage/QLE/2_Blue_QLE.svg';
                            } else if($scope.busy[i].car_type == 1) {
                                url = 'assets/img/driver_intransit.svg';
                            } else if($scope.busy[i].car_type == 3) {
                                url = 'assets/carTypeImage/LUXE/2_Blue_LUXE.svg';
                            } else if($scope.busy[i].car_type == 4) {
                                url = 'assets/carTypeImage/Grande/2_Blue_Grande.svg';
                            }
                            var infowindow = new google.maps.InfoWindow({
                                content: "<div style='font-size: 9px;'>" +
                                "<span>Name</span> : <span>" + $scope.busy[i].driver_name + "</span><br>" +
                                "<span>Email</span> : <span>" + $scope.busy[i].driver_email + "</span><br>" +
                                "<span>Mobile</span> : <span>" + $scope.busy[i].driver_mobile + "</span>" +
                                "</div>",
                                disableAutoPan: true
                            });
                            image.url = `${url}#${$scope.busy[i].driver_id}`;
                                        //   setMarker($scope.busy[i], { image, infowindow, rotation })
                                          //map.panTo(marker.position);
                                          // marker.addListener('click', function () {
                                          //     this.infoWindow.open(map, this);
                                          // });
                                          //rotation = rotation >= 360 ? 0 : rotation + 10;
                        }
                                          //$scope.select.selectedIndex == 1 && map.fitBounds(bounds);
                    }
                });


                         

                socketFactory.on('busyDrivers', function(data) {
                    $scope.busy = data[0].data.paginated_drivers;
                    //console.log("BUSY",$scope.busy);

                                if($scope.select.selectedIndex == 1) { //|| $scope.select.selectedIndex == 3){ // for busy and all
                        // var url = 'assets/img/driver_intransit.svg';
                        var url;
                        var image = {
                            url: url, // image is 512 x 512
                            scaledSize: new google.maps.Size(33, 33),
                            anchor: new google.maps.Point(16.5, 16.5)
                        };
                        $scope.bzy = new Array();
                        //var bounds = new google.maps.LatLngBounds();
                        _.each($scope.busy, function (key, value) {
                            $scope.bzy.push(_.pick(key, 'current_location_latitude', 'current_location_longitude'));
                        });
                        //console.log(' buzy dri', $scope.bzy);
                        for (var i = 0; i < $scope.bzy.length; i++) {
                            // var position = new google.maps.LatLng($scope.bzy[i].current_location_latitude, $scope.bzy[i].current_location_longitude);
                            //bounds.extend(position);
                            if($scope.busy[i].car_type == 1) {
                                url = 'assets/carTypeImage/QLE/2_Blue_QLE.svg';
                            } else if($scope.busy[i].car_type == 1) {
                                url = 'assets/img/driver_intransit.svg';
                            } else if($scope.busy[i].car_type == 2) {
                                url = 'assets/carTypeImage/LUXE/2_Blue_LUXE.svg';
                            } else if($scope.busy[i].car_type == 3) {
                                url = 'assets/carTypeImage/Grande/2_Blue_Grande.svg';
                            }
                            var infowindow = new google.maps.InfoWindow({
                                content: "<div style='font-size: 9px;'>" +
                                "<span>Name</span> : <span>" + $scope.busy[i].driver_name + "</span><br>" +
                                "<span>Email</span> : <span>" + $scope.busy[i].driver_email + "</span><br>" +
                                "<span>Mobile</span> : <span>" + $scope.busy[i].driver_mobile + "</span>" +
                                "</div>",
                                disableAutoPan: true
                            });
                            image.url = `${url}#${$scope.busy[i].driver_id}`;
                            setMarker($scope.busy[i], { image, infowindow, rotation })
                            //map.panTo(marker.position);
                            // marker.addListener('click', function () {
                            //     this.infoWindow.open(map, this);
                            // });
                            //rotation = rotation >= 360 ? 0 : rotation + 10;
                        }
                        //$scope.select.selectedIndex == 1 && map.fitBounds(bounds);
                    }
                });

                socketFactory.on('offlineDrivers', function(data) {
                    $scope.offline = data[0].data.paginated_drivers;
                    //console.log("BUSY",$scope.busy);
                    // var url = 'assets/img/driver_offline.svg';
                    var url;
                    var image = {
                        url: url, // image is 512 x 512
                        scaledSize: new google.maps.Size(33, 33),
                        anchor: new google.maps.Point(16.5, 16.5)
                    };
                   
                    for (var i = 0; i < $scope.offline.length; i++) {
                        if($scope.offline[i].car_type == 2) {
                            url = 'assets/carTypeImage/QLE/1_Grey_QLE.svg';
                        } else if($scope.offline[i].car_type == 1) {
                            url = 'assets/img/driver_offline.svg';
                        } else if($scope.offline[i].car_type == 3) {
                            url = 'assets/carTypeImage/LUXE/1_Grey_LUXE.svg';
                        } else if($scope.offline[i].car_type == 4) {
                            url = 'assets/carTypeImage/Grande/1_Grey_Grande.svg';
                        }
                        var infowindow = new google.maps.InfoWindow({
                            content: "<div style='font-size: 9px;'>" +
                            "<span>Name</span> : <span>" + $scope.offline[i].driver_name + "</span><br>" +
                            "<span>Email</span> : <span>" + $scope.offline[i].driver_email + "</span><br>" +
                            "<span>Mobile</span> : <span>" + $scope.offline[i].driver_mobile + "</span>" +
                            "</div>",
                            disableAutoPan: true
                        });
                        image.url = `${url}#${$scope.offline[i].driver_id}`;
                        setMarker($scope.offline[i], { image, infowindow, rotation })
                        //map.panTo(marker.position);
                        // marker.addListener('click', function () {
                        //     this.infoWindow.open(map, this);
                        // });
                        //rotation = rotation >= 360 ? 0 : rotation + 10;
                    }
                    //$scope.select.selectedIndex == 1 && map.fitBounds(bounds);

                });

                //socketFactory.on('allDrivers', function(data) {
                   // $scope.all=data[0].data.paginated_drivers;
                    //console.log('all',$scope.all);
               // });




                /* -----Search Sockets Left Panel----*/


                $scope.left;
                $scope.left.selectedIndex = 1;
                $scope.searchL=function(data, id)
                {
                    if(id==0){
                        socketFactory.emit('getOngoingRides', {offset:0,limit:10,action:0,searchFlag:1,searchString:data});
                        socketFactory.on('ongoingRides', function(data) {
                            //console.log('ongoing................', data)
                            $scope.sockos=data[0].data.paginated_schedules;
                            $scope.scheduled_rides=data[0].data.paginated_schedules;

                        });}
                    if(id==1)
                    {
                        socketFactory.emit('getScheduledRides', {offset:0,limit:10,action:0,searchFlag:1,searchString:data});
                        socketFactory.on('scheduledRides', function(data) {
                            $scope.sockos=data[0].data.paginated_schedules;
                            $scope.scheduled_rides=data[0].data.paginated_schedules;
                        });}
                }


                /* -----Search Sockets Left Panel Ends----*/




                /* -----Search Sockets Right Panel----*/
                $scope.select.selectedIndex = 3;

                $scope.searchR=function(data, id){console.log("data is "+ data + "id "+id);
                    if(id ===0){
                        socketFactory.emit('getAvailableDrivers', {offset:0,limit:10,action:0,searchFlag:1,searchString:data});
                        socketFactory.on('availableDrivers', function(data) {
                            $scope.avail=data[0].data.paginated_drivers;

                        });}
                    if(id === 1) {   console.log("data is "+ data + "id "+id);
                        socketFactory.emit('getBusyDrivers', {offset:0,limit:10,action:0,searchFlag:1,searchString:data});
                        socketFactory.on('busyDrivers', function(data) {
                            $scope.busy=data[0].data.paginated_drivers;
                        });}
                    if(id === 2){     console.log("data is "+ data + "id "+id);
                        socketFactory.emit('getAllDrivers', {offset:0,limit:10,action:0,searchFlag:1,searchString:data});
                        socketFactory.on('allDrivers', function(data) {
                            $scope.all=data[0].data.paginated_drivers;
                        });}}
                /* -----Search Sockets Right Panel Ends----*/


                socketFactory.on('notificationRides', function(data) {
                    //console.log('data notification ',data);
                    toastr.info('The Trip#  '+data[0].sessionId+' has been '+ data[0].status , 'Information');

                });}

        });
        $scope.$on('$destroy', function (event)
        {
            $window.socket.disconnect()
        });

        // var directionsService = new google.maps.DirectionsService;
        // var directionsDisplay = new google.maps.DirectionsRenderer;
        var bounds = new google.maps.LatLngBounds();

        var map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: 40.674, lng: -73.945},
            zoom: 2,
            streetViewControl: false,
            mapTypeControl: false,

            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.LEFT_BOTTOM
            },
            fullscreenControl: true,
            fullscreenControlOptions: {
                position: google.maps.ControlPosition.LEFT_TOP
            }

        });

        // socketFactory.on('driverLocation',function (data) {
        //     var lat = data.lat, long = data.long;
        //
        // })
        var directionsDisplay = new google.maps.DirectionsRenderer();
        var directionsService = new google.maps.DirectionsService();

        $scope.getStateButton = function(index) {

        }
        
        $scope.getDirections = function () {
            directionsDisplay.setMap(map);

            var request = {
                origin: $scope.strtloca,
                destination: $scope.mdes,
                travelMode: google.maps.DirectionsTravelMode.DRIVING
            };

            directionsService.route(request, function (response, status) {

                if (status === google.maps.DirectionsStatus.OK) {
                    directionsDisplay.setDirections(response);
                } else {
                    alert('Google route unsuccesfull!');
                }

            });

        }

        
        $scope.getButtonText = function(index) {
            switch(index) {
                case 1:
                    return "Accept";
                case 2:
                    return "Arrived";
                case 3:
                    return "En Route";
                case 4:
                    return "Completed";
                default:
                    return;
            }
        }

        $scope.showonm = function(data) {
            var routeState = {}
            if (data['session_id']) {
                routeState = {
                    key: 'session_id',
                    id: data.session_id
                }
                $scope.strtloca = data.pickup_latitude + ',' + data.pickup_longitude;
            } else if (data['pickup_id']) {
                routeState = {
                    key: 'pickup_id',
                    id: data.pickup_id
                }
                $scope.strtloca = data.latitude + ',' + data.longitude;
            }
            if ($scope.routeState && $scope.routeState.key == routeState.key && $scope.routeState.id == routeState.id) {
                directionsDisplay.setMap(null);
                $scope.routeState = null;
            } else {
                $scope.routeState = routeState;
                $scope.mdes = data.manual_destination_latitude + ','+ data.manual_destination_longitude;
                $scope.getDirections();
            }
        }

        $scope.isOpen==true;
        $scope.tog=1;

        $scope.toggleRight=function(m) {

            $scope.tog=!$scope.tog;

            if($scope.tog==0){
                $("#Nav").animate({right: '-400px'});
                $('#ffff').removeClass('fa-chevron-right').addClass('fa-chevron-left');
            }
            else if($scope.tog==1){
                $("#Nav").animate({right: '0px'});
                $('#ffff').removeClass('fa-chevron-left').addClass('fa-chevron-right');
            }
        }

        var boundsListener = google.maps.event.addListener((map), 'bounds_changed', function(event) {
            this.setZoom(3);
            google.maps.event.removeListener(boundsListener);
        });
        
        $rootScope.$watch('status', function(newValue, oldValue) {
            // console.log(newValue, oldValue)
            // for(let marker of markers) {
                if(!newValue) {
                    $('div.custom-close').parent().css({opacity: 0})
                    // marker.marker.infoWindow.close();
                } else {
                    $('div.custom-close').parent().css({opacity: 1})
                    // new google.maps.event.trigger( marker.marker, 'click' );
                }
            // }
        });
        
        $rootScope.$watch('statusCity', function(newValue, oldValue) {
            // console.log(newValue, oldValue)
            if (newValue == '7') {
                return;
            }
            var locationRio;
            var diff;
            switch(newValue) {
                case 0:
                    locationRio = {lat:  40.711729, lng: -73.708655};
                    diff = 0.1;
                    break;
                case 1:
                    locationRio = {lat:  40.672230, lng: -73.924245};
                    diff = 0.03;
                    break;
                case 2:
                    locationRio = {lat:  40.739413, lng: -73.959919};
                    diff = 0.03;
                    break;
                case 3:
                    locationRio = {lat:  40.829506, lng: -73.855206};
                    diff = 0.04;
                    break;
                case 4:
                    locationRio = {lat:  40.745159, lng: -73.864951};
                    diff = 0.03;
                    break;
                case 5:
                    locationRio = {lat:  40.727179, lng: -73.444835};
                    diff = 0.1;
                    break;
                default:
                    return;
            }
            var leftTop = {lat: locationRio.lat - diff, lng: locationRio.lng - diff};
            var rightBottom = {lat: locationRio.lat + diff, lng: locationRio.lng + diff};
            // console.log(leftTop, rightBottom)
            locationRio = new google.maps.LatLngBounds(leftTop, rightBottom);
            // var locationRio = new google.maps.LatLngBounds();
            // locationRio.extend(center);
            $scope.mappresetzoom(locationRio);
        });
        
        $scope.mappresetzoom = function(area) {
            map.fitBounds(area);
            map.panToBounds(area);
        }
    }

})();
