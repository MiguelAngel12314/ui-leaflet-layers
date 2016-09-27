/**
           * ui-leaflet-layers
           *
           * @version: 0.1.1
           * @author: Michael Salgado <elesdoar@gmail.com>
           * @date: Tue Sep 27 2016 11:41:57 GMT-0500 (COT)
           * @license: MIT
           */
(function (window, angular){
  'use strict';
  angular.module('ui-leaflet').config(function ($provide) {
  return $provide.decorator('leafletHelpers', function ($delegate, leafletLayersLogger) {
    var $log = leafletLayersLogger;

    var basicFunction = function basicFunction(layerType) {
      return {
        isLoaded: function isLoaded() {
          return angular.isDefined(layerType);
        },
        is: function is(layer) {
          if (this.isLoaded()) {
            return layer instanceof layerType;
          }
          return false;
        }
      };
    };

    var plugins = {
      // Please keep keys order by alphabetical sort.
      BingLayerPlugin: basicFunction(L.BingLayer),
      ChinaLayerPlugin: basicFunction(L.tileLayer.chinaProvider),
      GoogleLayerPlugin: basicFunction(L.Google),
      HeatLayerPlugin: basicFunction(L.heatLayer),
      LeafletProviderPlugin: basicFunction(L.TileLayer.Provider),
      MapboxGL: basicFunction(L.mapboxGL),
      MarkerClusterPlugin: basicFunction(L.MarkerClusterGroup),
      UTFGridPlugin: basicFunction(L.UtfGrid),
      WebGLHeatMapLayerPlugin: basicFunction(L.TileLayer.WebGLHeatMap),
      WFSLayerPlugin: basicFunction(L.GeoJSON.WFS),
      YandexLayerPlugin: basicFunction(L.Yandex)
    };

    if (angular.isDefined(L.esri)) {
      angular.extend(plugins, {
        AGSBaseLayerPlugin: basicFunction(L.esri.basemapLayer),
        AGSClusteredLayerPlugin: basicFunction(L.esri.clusteredFeatureLayer),
        AGSDynamicMapLayerPlugin: basicFunction(L.esri.dynamicMapLayer),
        AGSFeatureLayerPlugin: basicFunction(L.esri.featureLayer),
        AGSImageMapLayerPlugin: basicFunction(L.esri.imageMapLayer),
        AGSHeatmapLayerPlugin: basicFunction(L.esri.heatmapFeatureLayer),
        AGSTiledMapLayerPlugin: basicFunction(L.esri.tiledMapLayer)
      });
    } else {
      angular.extend(plugins, {
        AGSBaseLayerPlugin: basicFunction(),
        AGSClusteredLayerPlugin: basicFunction(),
        AGSDynamicMapLayerPlugin: basicFunction(),
        AGSFeatureLayerPlugin: basicFunction(),
        AGSImageMapLayerPlugin: basicFunction(),
        AGSHeatmapLayerPlugin: basicFunction(),
        AGSTiledMapLayerPlugin: basicFunction()
      });
    }

    if (angular.isDefined(window.lvector)) {
      angular.extend(plugins, {
        AGSLayerPlugin: basicFunction(window.lvector.AGS)
      });
    } else {
      angular.extend(plugins, {
        AGSLayerPlugin: basicFunction()
      });
    }

    angular.extend($delegate, plugins);

    $log.info('[ui-leaflet-layers] - Layers plugin is loaded');

    return $delegate;
  });
});
angular.module('ui-leaflet').config(function ($provide) {
  return $provide.decorator('leafletLayerHelpers', function ($delegate, $rootScope, $q, leafletHelpers, leafletLayersLogger) {
    var $log = leafletLayersLogger;
    var isArray = leafletHelpers.isArray;
    var isObject = leafletHelpers.isObject;
    var isDefined = leafletHelpers.isDefined;
    var errorHeader = leafletHelpers.errorHeader;

    var utfGridCreateLayer = function utfGridCreateLayer(params) {
      if (!leafletHelpers.UTFGridPlugin.isLoaded()) {
        $log.error(errorHeader + ' The UTFGrid plugin is not loaded.');
        return;
      }

      var utfgrid = new L.UtfGrid(params.url, params.pluginOptions);

      utfgrid.on('mouseover', function (e) {
        $rootScope.$broadcast('leafletDirectiveMap.utfgridMouseover', e);
      });

      utfgrid.on('mouseout', function (e) {
        $rootScope.$broadcast('leafletDirectiveMap.utfgridMouseout', e);
      });

      utfgrid.on('click', function (e) {
        $rootScope.$broadcast('leafletDirectiveMap.utfgridClick', e);
      });

      utfgrid.on('mousemove', function (e) {
        $rootScope.$broadcast('leafletDirectiveMap.utfgridMousemove', e);
      });

      return utfgrid;
    };

    angular.extend($delegate.layerTypes, {
      ags: {
        mustHaveUrl: true,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.AGSLayerPlugin.isLoaded()) {
            return;
          }

          var options = angular.copy(params.options);
          angular.extend(options, {
            url: params.url
          });
          var layer = new lvector.AGS(options);
          layer.onAdd = function (map) {
            this.setMap(map);
          };
          layer.onRemove = function () {
            this.setMap(null);
          };
          return layer;
        }
      },
      agsBase: {
        mustHaveLayer: true,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.AGSBaseLayerPlugin.isLoaded()) {
            return;
          }
          return L.esri.basemapLayer(params.layer, params.options);
        }
      },
      agsClustered: {
        mustHaveUrl: true,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.AGSClusteredLayerPlugin.isLoaded()) {
            $log.warn(errorHeader + ' The esri clustered layer plugin is not loaded.');
            return;
          }

          if (!leafletHelpers.MarkerClusterPlugin.isLoaded()) {
            $log.warn(errorHeader + ' The markercluster plugin is not loaded.');
            return;
          }
          return L.esri.clusteredFeatureLayer(params.url, params.options);
        }
      },
      agsDynamic: {
        mustHaveUrl: true,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.AGSDynamicMapLayerPlugin.isLoaded()) {
            $log.warn(errorHeader + ' The esri plugin is not loaded.');
            return;
          }

          params.options.url = params.url;

          return L.esri.dynamicMapLayer(params.options);
        }
      },
      agsFeature: {
        mustHaveUrl: true,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.AGSFeatureLayerPlugin.isLoaded()) {
            $log.warn(errorHeader + ' The esri plugin is not loaded.');
            return;
          }

          params.options.url = params.url;

          var layer = L.esri.featureLayer(params.options);
          var load = function load() {
            if (isDefined(params.options.loadedDefer)) {
              params.options.loadedDefer.resolve();
            }
          };
          layer.on('loading', function () {
            params.options.loadedDefer = $q.defer();
            layer.off('load', load);
            layer.on('load', load);
          });

          return layer;
        }
      },
      agsHeatmap: {
        mustHaveUrl: true,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.AGSHeatmapLayerPlugin.isLoaded()) {
            $log.warn(errorHeader + ' The esri heatmap layer plugin is not loaded.');
            return;
          }

          if (!leafletHelpers.HeatLayerPlugin.isLoaded()) {
            $log.warn(errorHeader + ' The heatlayer plugin is not loaded.');
            return;
          }
          return L.esri.heatmapFeatureLayer(params.url, params.options);
        }
      },
      agsImage: {
        mustHaveUrl: true,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.AGSImageMapLayerPlugin.isLoaded()) {
            $log.warn(errorHeader + ' The esri plugin is not loaded.');
            return;
          }
          params.options.url = params.url;

          return L.esri.imageMapLayer(params.options);
        }
      },
      agsTiled: {
        mustHaveUrl: true,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.AGSTiledMapLayerPlugin.isLoaded()) {
            $log.warn(errorHeader + ' The esri plugin is not loaded.');
            return;
          }

          params.options.url = params.url;

          return L.esri.tiledMapLayer(params.options);
        }
      },
      bing: {
        mustHaveUrl: false,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.BingLayerPlugin.isLoaded()) {
            $log.error(errorHeader + ' The Bing plugin is not loaded.');
            return;
          }
          return new L.BingLayer(params.key, params.options);
        }
      },

      china: {
        mustHaveUrl: false,
        createLayer: function createLayer(params) {
          var type = params.type || '';
          if (!leafletHelpers.ChinaLayerPlugin.isLoaded()) {
            $log.error(errorHeader + ' The ChinaLayer plugin is not loaded.');
            return;
          }
          return L.tileLayer.chinaProvider(type, params.options);
        }
      },

      google: {
        mustHaveUrl: false,
        createLayer: function createLayer(params) {
          var type = params.type || 'SATELLITE';
          if (!leafletHelpers.GoogleLayerPlugin.isLoaded()) {
            $log.error(errorHeader + ' The GoogleLayer plugin is not loaded.');
            return;
          }
          return new L.Google(type, params.options);
        }
      },

      heat: {
        mustHaveUrl: false,
        mustHaveData: true,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.HeatLayerPlugin.isLoaded()) {
            $log.error(errorHeader + ' The HeatMapLayer plugin is not loaded.');
            return;
          }
          var layer = new L.heatLayer();
          if (isArray(params.data)) {
            layer.setLatLngs(params.data);
          }
          if (isObject(params.options)) {
            layer.setOptions(params.options);
          }
          return layer;
        }
      },

      here: {
        mustHaveUrl: false,
        createLayer: function createLayer(params) {
          var provider = params.provider || 'HERE.terrainDay';
          if (!leafletHelpers.LeafletProviderPlugin.isLoaded()) {
            return;
          }
          return new L.TileLayer.Provider(provider, params.options);
        }
      },

      mapbox: {
        mustHaveKey: true,
        createLayer: function createLayer(params) {
          var version = 3;
          if (isDefined(params.options.version) && params.options.version === 4) {
            version = params.options.version;
          }
          var url = version === 3 ? '//{s}.tiles.mapbox.com/v3/' + params.key + '/{z}/{x}/{y}.png' : '//api.tiles.mapbox.com/v4/' + params.key + '/{z}/{x}/{y}.png?access_token=' + params.apiKey;
          return L.tileLayer(url, params.options);
        }
      },

      mapboxGL: {
        createLayer: function createLayer(params) {
          if (!leafletHelpers.MapboxGL.isLoaded()) {
            $log.error(errorHeader + ' The MapboxGL plugin is not loaded.');
            return;
          }
          return new L.mapboxGL(params.options);
        }
      },

      markercluster: {
        mustHaveUrl: false,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.MarkerClusterPlugin.isLoaded()) {
            $log.warn(errorHeader + ' The markercluster plugin is not loaded.');
            return;
          }
          return new L.MarkerClusterGroup(params.options);
        }
      },

      utfGrid: {
        mustHaveUrl: true,
        createLayer: utfGridCreateLayer
      },

      webGLHeatmap: {
        mustHaveUrl: false,
        mustHaveData: true,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.WebGLHeatMapLayerPlugin.isLoaded()) {
            $log.error(errorHeader + ' The WebGLHeatMapLayer plugin is not loaded.');
            return;
          }
          var layer = new L.TileLayer.WebGLHeatMap(params.options);
          if (isDefined(params.data)) {
            layer.setData(params.data);
          }
          return layer;
        }
      },

      wfs: {
        mustHaveUrl: true,
        mustHaveLayer: true,
        createLayer: function createLayer(params) {
          if (!leafletHelpers.WFSLayerPlugin.isLoaded()) {
            $log.error(errorHeader + ' The WFSLayer plugin is not loaded.');
            return;
          }
          var options = angular.copy(params.options);
          if (options.crs && 'string' === typeof options.crs) {
            options.crs = eval(options.crs);
          }
          return new L.GeoJSON.WFS(params.url, params.layer, options);
        }
      },

      yandex: {
        mustHaveUrl: false,
        createLayer: function createLayer(params) {
          var type = params.type || 'map';
          if (!leafletHelpers.YandexLayerPlugin.isLoaded()) {
            $log.error(errorHeader + ' The YandexLayer plugin is not loaded.');
            return;
          }
          return new L.Yandex(type, params.options);
        }
      }
    });

    return $delegate;
  });
});
angular.module('ui-leaflet').service('leafletLayersLogger', function (nemSimpleLogger) {
  return nemSimpleLogger.spawn();
});
//# sourceMappingURL=ui-leaflet-layers.js.map

})(window, angular);