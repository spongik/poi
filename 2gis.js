var fs = require('fs'),
	page = require('webpage').create(),
    system = require('system');

if (system.args.length === 1) {
    console.log('Usage: 2gis.js <city id>');
    phantom.exit(1);
} else {
	var city = system.args[1];
    var address = 'http://2gis.ru/' + city;

	page.settings.userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36';
	page.viewportSize = {
	  width: 1920,
	  height: 1080
	};

    page.open(address, function (status) {
        if (status !== 'success') {
            console.log('FAIL to load the address');
        } else {
			page.evaluate(function() {
				window.__items = [];
				window.__total = -1;
			
				XMLHttpRequest.prototype._send = XMLHttpRequest.prototype.send;
				XMLHttpRequest.prototype.send = function() {
					this._onreadystatechange = this.onreadystatechange;
					this.onreadystatechange = function() {
						if (this.readyState == 4 && this.response[0] == '{') {
							var json = JSON.parse(this.response);
							if (json && json.meta && json.meta.code == 200 && json.result && json.result.dym && json.result.dym.api_category == "branch") {
								for (var item in json.result.items) {
									window.__items.push(json.result.items[item])
								}
								window.__total = json.result.total;
							}
						}
						this._onreadystatechange != null && this._onreadystatechange.call(this, arguments);
					}
					this._send.call(this, arguments);
				};
			
				document.querySelector('.suggest__input').value = 'Гостиницы';
				document.querySelector('.searchBar__submit').click();
			
				setInterval(function() {
					var results = document.querySelector('.searchResults__scroller');
					if (results !== null) {
						results.scrollTop = results.scrollHeight;
					}
					var pagination = document.querySelector('.pagination__arrow._right');
					if (pagination !== null) {
						pagination.click();
					}
				}, 500);
			});
			
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
						fs.write('./2gis_' + city + '.json', JSON.stringify(items), 'w');
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