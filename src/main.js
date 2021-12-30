if(StockAssistant === undefined)
{
	var StockAssistant = {};
}

StockAssistant.name = 'Stock Assistant';

StockAssistant.launch = function()
{
	let initialized = false;

	const modeName = {
		0 : 'Stable',
		1 : 'Slow Rise',
		2 : 'Slow Fall',
		3 : 'Fast Rise',
		4 : 'Fast Fall',
		5 : 'Chaotic'
	};
	function getModeName(mode)
	{
		return loc(modeName[mode]);
	};

	const columnList = {
		0 : 'boughtValue',
		1 : 'restingValue',
		2 : 'minValue',
		3 : 'maxValue',
		4 : 'mode',
		5 : 'duration'
	};

	let loadData = {
		goods : [],
		views : {
			boughtValue : 1,
			restingValue : 1,
			minValue : 1,
			maxValue : 1,
			mode : 1,
			duration : 1,
		},
	};

	StockAssistant.stockData = {
		level : 0,
		goods : [],
		views : {
			boughtValue : 1,
			restingValue : 1,
			minValue : 1,
			maxValue : 1,
			mode : 1,
			duration : 1,
		},
	};

	//////////////////////////////////////////////////
	// public method
	//////////////////////////////////////////////////

	StockAssistant.init = async function ()
	{
		let isWait = true;

		do {
			if (Game.Objects['Bank'].minigameLoaded)
			{
				isWait = false;
			}
			else
			{
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		} while (isWait);

		StockAssistant.stockMarket = Game.Objects['Bank'].minigame;

		StockAssistant.stockData.level = StockAssistant.stockMarket.parent.level;

		// Tick時間変更ボタン追加
		let sptList = [1,10,30,60];
		let sptStr = '<div style="display: inline-block;"><span class="bankSymbol">' + loc('change the seconds per tick') + '</span>';
		sptList.forEach(spt => sptStr += '<div class="bankButton bankButtonBuy" id="bankSecondsPerTick_' + spt + '">' + spt + '</div>');
		sptStr += '</div>';
		l('bankNextTick').insertAdjacentHTML('afterend', sptStr);
		sptList.forEach(spt => {
			AddEvent(l('bankSecondsPerTick_' + spt),'click',function(spt){return function(e){StockAssistant.stockMarket.secondsPerTick=spt;}}(spt));
		});

		let optStr 
			= '<div>'
			+ '<div style="display: inline-block; padding: 1px 4px;">'
			+ '<span class="bankSymbol">' + loc('display switching') + '</span>'
			+ '<div class="bankButton bankButtonSell" id="toggleView_boughtValue">' + loc('Bought value') + '</div>'
			+ '<div class="bankButton bankButtonSell" id="toggleView_restingValue">' + loc('Resting value') + '</div>'
			+ '<div class="bankButton bankButtonSell" id="toggleView_minValue">' + loc('Min value') + '</div>'
			+ '<div class="bankButton bankButtonSell" id="toggleView_maxValue">' + loc('Max value') + '</div>'
			+ '<div class="bankButton bankButtonSell" id="toggleView_mode">' + loc('Mode') + '</div>'
			+ '<div class="bankButton bankButtonSell" id="toggleView_duration">' + loc('Duration') + '</div>'
			+ '</div>'
			+ '<div style="display: inline-block; padding: 1px 4px;">'
			+ '<span class="bankSymbol">' + loc('display reset') + '</span>'
			+ '<div class="bankButton bankButtonBuy" id="reset_minValue">' + loc('Min value') + '</div>'
			+ '<div class="bankButton bankButtonBuy" id="reset_maxValue">' + loc('Max value') + '</div>'
			+ '</div>'
			+ '</div>';

		l('bankHeader').firstChild.insertAdjacentHTML('beforeend', optStr);

		for (let idx in columnList)
		{
			AddEvent(l('toggleView_'+ columnList[idx]),'click',function(){return function(e){StockAssistant.toggleColumnView(columnList[idx]);}}());
		}

		AddEvent(l('reset_minValue'),'click',function(){return function(e){StockAssistant.resetVal('minValue');}}());
		AddEvent(l('reset_maxValue'),'click',function(){return function(e){StockAssistant.resetVal('maxValue');}}());

		for (let idx = 0; idx < StockAssistant.stockMarket.goodsById.length; ++idx)
		{
			let good = StockAssistant.stockMarket.goodsById[idx];
			let parent = good.l.firstChild;
			let keyRestingVal = 'bankGood-' + idx + '-restingVal';
			let keyMinVal = 'bankGood-' + idx + '-minVal';
			let keyMaxVal = 'bankGood-' + idx + '-maxVal';
			let keyBoughtVal =  'bankGood-' + idx + '-boughtVal';
			let keyMode = 'bankGood-' + idx + '-mode';
			let keyDur = 'bankGood-' + idx + '-dur';

			let boughtVal = 0;
			let stock = 0;
			let min = Number(Beautify(good.val,2));
			let max = min;

			// ロードデータあれば使用する
			if (loadData.goods[idx])
			{
				boughtVal = loadData.goods[idx].boughtVal;
				stock = loadData.goods[idx].stock;
				if (loadData.goods[idx].min !==0) min = loadData.goods[idx].min;
				if (loadData.goods[idx].max !==0) max = loadData.goods[idx].max;
			}
			// データ無いけど購入済の場合は購入価格が不明なので基準価格を入れておく
			if ((boughtVal == 0 || stock == 0) && good.stock != 0)
			{
				stock = good.stock;
				boughtVal = StockAssistant.stockMarket.getRestingVal(idx);
			}

			parent.appendChild(createInfoElement(keyBoughtVal, '$'+boughtVal, loc('Bought value')));
			parent.appendChild(createInfoElement(keyRestingVal, '$'+StockAssistant.stockMarket.getRestingVal(idx), loc('Resting value')));
			parent.appendChild(createInfoElement(keyMinVal, '$'+min, loc('Min value')));
			parent.appendChild(createInfoElement(keyMaxVal, '$'+max, loc('Max value')));
			parent.appendChild(createInfoElement(keyMode, getModeName(good.mode), loc('Mode')));
			parent.appendChild(createInfoElement(keyDur, good.dur, loc('Duration')));

			StockAssistant.stockData.goods[idx] = {
				boughtValL : l(keyBoughtVal),
				restingValL : l(keyRestingVal),
				minL : l(keyMinVal),
				maxL : l(keyMaxVal),
				modeL : l(keyMode),
				durL : l(keyDur),
				stock : stock,
				boughtVal : boughtVal,
				min : min,
				max : max,
				columnL : {
					boughtValue : l(keyBoughtVal).parentElement,
					restingValue : l(keyRestingVal).parentElement,
					minValue : l(keyMinVal).parentElement,
					maxValue : l(keyMaxVal).parentElement,
					mode : l(keyMode).parentElement,
					duration :l(keyDur).parentElement
				}
			};

			AddEvent(l('bankGood-'+idx+'_1'),'click',function(idx){return function(e){StockAssistant.buyGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_-1'),'click',function(idx){return function(e){StockAssistant.sellGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_10'),'click',function(idx){return function(e){StockAssistant.buyGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_-10'),'click',function(idx){return function(e){StockAssistant.sellGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_100'),'click',function(idx){return function(e){StockAssistant.buyGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_-100'),'click',function(idx){return function(e){StockAssistant.sellGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_Max'),'click',function(idx){return function(e){StockAssistant.buyGood(idx);}}(idx));
			AddEvent(l('bankGood-'+idx+'_-All'),'click',function(idx){return function(e){StockAssistant.sellGood(idx);}}(idx));

			modeUpdateById(idx);
		}

		// 表示切り替え反映
		for (let idx in columnList)
		{
			if (StockAssistant.stockData.views[columnList[idx]] !== loadData.views[columnList[idx]])
			{
				StockAssistant.toggleColumnView(columnList[idx]);
			}
		}

		Game.registerHook('reset', StockAssistant.reset);
		Game.registerHook('logic', StockAssistant.logic);

		initialized = true;
	}

	StockAssistant.save = function()
	{
		let str = '';
		for (let idx = 0; idx < StockAssistant.stockData.goods.length; ++idx)
		{
			let it = StockAssistant.stockData.goods[idx];
			str += parseInt(it.boughtVal * 100) + ':' + parseInt(it.stock) + ':' + parseInt(it.min * 100) + ':' + parseInt(it.max * 100) + '!';
		}

		let viewVal = 0;
		for (let idx in columnList)
		{
			let id = columnList[idx];
			viewVal += StockAssistant.stockData.views[id] * (2 ** parseInt(idx));
		}
		str += '|' + viewVal;

		return str;
	}

	StockAssistant.load = function(str)
	{
		if (!str) return false;

		let tmp = str.split('|');

		let goods = tmp[0].split('!');
		let views = parseInt(tmp[1]);

		for (let idx = 0; idx < goods.length; ++idx)
		{
			if (goods[idx] == '') continue;

			let good = goods[idx].split(':');
			loadData.goods[idx] = {
				boughtVal : parseInt(good[0]??0) / 100,
				stock : parseInt(good[1]??0),
				min : parseInt(good[2]??0) / 100,
				max : parseInt(good[3]??0) / 100,
			};
		}

		for (let idx in columnList)
		{
			loadData.views[columnList[idx]] = views % 2;
			views = Math.floor(views / 2);
		}

		if (initialized)
		{
			// 保持データ反映
			for (let idx = 0; idx < StockAssistant.stockData.goods.length; ++idx)
			{
				if (!loadData.goods[idx]) continue;
	
				let it = StockAssistant.stockData.goods[idx];
	
				it.boughtVal = loadData.goods[idx].boughtVal;
				it.stock = loadData.goods[idx].stock;
				it.min = loadData.goods[idx].min;
				it.max = loadData.goods[idx].max;
	
				it.boughtValL.innerHTML = '$'+it.boughtVal;
				it.minL.innerHTML = '$'+it.min;
				it.maxL.innerHTML = '$'+it.max;
			}

			// 表示切り替え反映
			for (let idx in columnList)
			{
				if (StockAssistant.stockData.views[columnList[idx]] !== loadData.views[columnList[idx]])
				{
					StockAssistant.toggleColumnView(columnList[idx]);
				}
			}
		}
	}

	StockAssistant.reset = function(hard)
	{
		if (hard)
		{
			for (let idx = 0; idx < StockAssistant.stockData.goods.length; ++idx)
			{
				StockAssistant.stockData.goods[idx].boughtVal = 0;
				StockAssistant.stockData.goods[idx].stock = 0;
				StockAssistant.stockData.goods[idx].min = 0;
				StockAssistant.stockData.goods[idx].max = 0;
				StockAssistant.stockData.goods[idx].boughtValL.innerHTML = '$0';
				StockAssistant.stockData.goods[idx].minL.innerHTML = '$0';
				StockAssistant.stockData.goods[idx].maxL.innerHTML = '$0';
			}
		}
		else
		{
			for (let idx = 0; idx < StockAssistant.stockData.goods.length; ++idx)
			{
				StockAssistant.stockData.goods[idx].boughtVal = 0;
				StockAssistant.stockData.goods[idx].stock = 0;
				StockAssistant.stockData.goods[idx].boughtValL.innerHTML = '$0';
			}
		}
	}
	
	StockAssistant.logic = function()
	{
		// レベル上がってたら基準価格を更新
		if (StockAssistant.stockData.level != StockAssistant.stockMarket.parent.level)
		{
			StockAssistant.stockData.level = StockAssistant.stockMarket.parent.level;
			for (let idx = 0; idx < StockAssistant.stockData.goods.length; ++idx)
			{
				StockAssistant.stockData.goods[idx].restingValL.innerHTML = '$'+StockAssistant.stockMarket.getRestingVal(idx);
			}
		}

		StockAssistant.tick();	
	}

	StockAssistant.tick = function()
	{
		if (StockAssistant.ticks != StockAssistant.stockMarket.ticks)
		{
			StockAssistant.ticks = StockAssistant.stockMarket.ticks;

			for (let idx = 0; idx < StockAssistant.stockMarket.goodsById.length; ++idx)
			{
				let good = StockAssistant.stockMarket.goodsById[idx];
				let it = StockAssistant.stockData.goods[idx];
				it.modeL.innerHTML = getModeName(good.mode);
				it.durL.innerHTML = good.dur;

				modeUpdateById(idx);

				let val = Number(Beautify(good.val,2));
				if (it.max < val)
				{
					it.max = val;
					it.maxL.innerHTML = '$'+val;
				}
				if (it.min==0 || it.min > val)
				{
					it.min = val;
					it.minL.innerHTML = '$'+val;
				}

				if (it.boughtVal == 0)
				{
					it.boughtValL.classList.remove('bankSymbolUp');
					it.boughtValL.classList.remove('bankSymbolDown');
				}
				else if (it.boughtVal < val)
				{
					it.boughtValL.classList.add('bankSymbolUp');
					it.boughtValL.classList.remove('bankSymbolDown');
				}
				else
				{
					it.boughtValL.classList.remove('bankSymbolUp');
					it.boughtValL.classList.add('bankSymbolDown');
				}
			}
		}
	}

	StockAssistant.buyGood = function(id)
	{
		if (StockAssistant.stockMarket.goodsById[id].stock == 0) return;

		let buyStock = StockAssistant.stockMarket.goodsById[id].stock - StockAssistant.stockData.goods[id].stock;
		let boughtVal = ((StockAssistant.stockMarket.goodsById[id].val * buyStock) + (StockAssistant.stockData.goods[id].boughtVal * StockAssistant.stockData.goods[id].stock)) / StockAssistant.stockMarket.goodsById[id].stock;
		boughtVal = Beautify(boughtVal,2);

		StockAssistant.stockData.goods[id].stock = StockAssistant.stockMarket.goodsById[id].stock;
		StockAssistant.stockData.goods[id].boughtVal = boughtVal;

		StockAssistant.stockData.goods[id].boughtValL.innerHTML = '$'+boughtVal;
	}

	StockAssistant.sellGood = function(id)
	{
		StockAssistant.stockData.goods[id].stock = StockAssistant.stockMarket.goodsById[id].stock;
		if (StockAssistant.stockData.goods[id].stock == 0)
		{
			StockAssistant.stockData.goods[id].boughtVal = 0;
			StockAssistant.stockData.goods[id].boughtValL.innerHTML = '$0';
			StockAssistant.stockData.goods[id].boughtValL.classList.remove('bankSymbolUp');
			StockAssistant.stockData.goods[id].boughtValL.classList.remove('bankSymbolDown');
		}
	}

	StockAssistant.toggleColumnView = function(id)
	{
		StockAssistant.stockData.views[id] = 1 - StockAssistant.stockData.views[id];

		if (StockAssistant.stockData.views[id])
		{
			l('toggleView_'+id).classList.remove('bankButtonOff');
		}
		else
		{
			l('toggleView_'+id).classList.add('bankButtonOff');
		}
		let display = StockAssistant.stockData.views[id] ? 'block' : 'none' ;
		
		for (let idx = 0; idx < StockAssistant.stockMarket.goodsById.length; ++idx)
		{
			StockAssistant.stockData.goods[idx].columnL[id].style.display = display;
		}
	}

	StockAssistant.resetVal = function(id)
	{
		switch (id)
		{
			case columnList[2]:
				// minVal
				for (let idx = 0; idx < StockAssistant.stockMarket.goodsById.length; ++idx)
				{
					let good = StockAssistant.stockMarket.goodsById[idx];
					let it = StockAssistant.stockData.goods[idx];
					
					val = Number(Beautify(good.val,2));
					it.min = val;
					it.minL.innerHTML = '$'+val;
				}
				break;
			case columnList[3]:
				// maxVal
				for (let idx = 0; idx < StockAssistant.stockMarket.goodsById.length; ++idx)
				{
					let good = StockAssistant.stockMarket.goodsById[idx];
					let it = StockAssistant.stockData.goods[idx];
					
					val = Number(Beautify(good.val,2));
					it.max = val;
					it.maxL.innerHTML = '$'+val;
				}
				break;
		}
	}

	//////////////////////////////////////////////////
	// private method
	//////////////////////////////////////////////////

	function createInfoElement(key, value, name)
	{
		let div = document.createElement('div');
		div.innerHTML = '<div class="bankSymbol" style="margin:1px 0px;display:block;font-size:10px;width:100%;background:linear-gradient(to right,transparent,#333,#333,transparent);padding:2px 0px;overflow:hidden;white-space:nowrap;"> ' + name + '： <span style="font-weight:bold;" id="' + key + '">' + value + '</span></div>';
		return div.firstChild;
	}

	function modeUpdateById(id)
	{
		let classList = StockAssistant.stockData.goods[id].modeL.classList;
		switch (StockAssistant.stockMarket.goodsById[id].mode)
		{
			case 1:
			case 3:
				classList.add('bankSymbolUp');
				classList.remove('bankSymbolDown');
				break;
			case 2:
			case 4:
				classList.remove('bankSymbolUp');
				classList.add('bankSymbolDown');
				break;
			default:
				classList.remove('bankSymbolUp');
				classList.remove('bankSymbolDown');
		}
	}

	//////////////////////////////////////////////////
	// exec
	//////////////////////////////////////////////////
	Game.registerMod(StockAssistant.name, StockAssistant);
}

StockAssistant.launch();
