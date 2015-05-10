var fs = require('fs'),
	page = require('webpage').create(),
    system = require('system');

if (system.args.length === 1) {
    console.log('Usage: yandex.js <city name>');
    phantom.exit(1);
} else {
	var city = system.args[1];
    var address = 'https://old.maps.yandex.ru/';

	page.settings.userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36';
	page.viewportSize = {
	  width: 1920,
	  height: 1080
	};

    page.open(address, function (status) {
        if (status !== 'success') {
            console.log('FAIL to load the address');
        } else {
			page.evaluate(function(city) {
				window.__items = [];
				window.__total = -1;
			
				XMLHttpRequest.prototype._send = XMLHttpRequest.prototype.send;
				XMLHttpRequest.prototype.send = function() {
					this._send.call(this, arguments);
					var _this = this;
					var watch = setInterval(function() {
						if (_this.readyState == 4 && _this.response[0] == '{') {
							clearInterval(watch);
							var json = JSON.parse(_this.response);
							var features, total;
							
							if (json && json.type == 'FeatureCollection' && json.features) {
								features = json.features;
								total = json.properties.ResponseMetaData.SearchResponse.found;
							} else if (json && json.vpage && json.vpage.data && json.vpage.data.businesses && json.vpage.data.businesses.GeoObjectCollection) {
								features = json.vpage.data.businesses.GeoObjectCollection.features;
								total = json.vpage.data.businesses.found;
							}
							
							if (features) {
								for (var item in features) {
									window.__items.push(features[item])
								}
								window.__total = total;
							}
						}
					}, 100);
				};
				
				setTimeout(function() {
					document.querySelector('.b-search__input .b-form-input__input').value = city + ' Гостиница';
					document.querySelector('.b-search__button .b-form-button__input').click();
					
					setInterval(function() {
						var more = document.querySelector('.b-serp-unfold .b-form-button');
						if (more !== null) {
							more.click();
						}
					}, 2000);
				}, 2000);
			}, city);
			
			setInterval(function() {
				var progress = page.evaluate(function() {
					return [window.__items.length, window.__total];
				});
				var gathered = progress[0], total = progress[1];
				
				if (total != -1) {
					console.log('gathered', gathered, 'of', total, '(' + Math.round((gathered/total)*100) + '%)');
				}
			
				if (gathered >= total && total != -1) {
					console.log('saving...');
					try {
						var items = page.evaluate(function() {
							return window.__items;
						});
						fs.write('./yandex_' + city + '.json', JSON.stringify(items), 'w');
					} catch(e) {
						console.log('error while saving result:');
						console.log(e);
						phantom.exit(1);
					}
					
					phantom.exit();
				}
			}, 1000);
		}
    });
}