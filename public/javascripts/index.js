var values = new function(){};

/*
 * ロード処理
 */
$(function(){
	'use strict';
	
	values.reader = new FileReader();
	values.socket = io.connect();
	
	if (!window.File){
		result.innerHTML = "File API 使用不可";
		return;
	}
	
	
	// 写真がブロードキャストされたとき
	values.socket.on('photo_delivery', function(data){
		// 写真追加
		events.addPhoto(data.orientation, data.photo);
	});
	
	/*
	 * 写真撮った時
	 */
	$(values.reader).on('load', function(event){
		
		if(values.reader.result.lastIndexOf('data:image', 0) !== 0){
			alert('画像じゃないよ');
			return;
		}
		
		var orientation = events.getOrientation(values.reader.result);
		
		// 写真追加
		events.addPhoto(orientation, values.reader.result);
		
		// ソケットに送信
		values.socket.emit('photo_send',
			{
				orientation : orientation,
				photo : values.reader.result
			}
		);
		
	});
	
	
	// 写真が選択されたらリーダに食わせる
	$('#imageFile').on('change', function(){
		values.reader.readAsDataURL($(this).prop('files')[0]);
	});
	
	
	$.ajax(
		{
			type: 'GET', cache : false, url: '/photos', dataType: 'json'
		}

	// 成功時
	).done(function(response, textStatus, jqXHR){
		
		if(response){
			
			response.forEach(function(id){
				
				events.addPhoto(response.orientation, '' ,id)

				$.ajax(
					{
						type: 'GET', cache : false, url: '/photos/' + id, dataType: 'json'
					}
				// 成功時
				).done(function(response, textStatus, jqXHR){
					$('#' + id).prop('src', response.photo);
					$('#' + id).addClass('orientation' + response.orientation);
					
				// 失敗時
				}).fail(function(jqXHR, textStatus, errorThrown){
					console.log(jqXHR);
				});

			});
		}
		
	// 失敗時
	}).fail(function(jqXHR, textStatus, errorThrown){
		console.log(jqXHR);
	});
	
	
});



/*
 * 画面イベント
 */
var events = new function(){
	'use strict';
	
	
	/**
	 * 写真の追加
	 */
	this.addPhoto = function(orientation, photo, id){
		var li = $('<li>')
				.append(
					$('<img>', 
						{
							id : id,
							src : photo,
							class : 'orientation' + orientation
						}
					)
				);
		$('#photos').append(li);
	};
	
	
	/**
	 * jpegの向き取得
	 */
	this.getOrientation = function(imgDataURL){
		
		var byteString = atob(imgDataURL.split(',')[1]);
		var head = 0;
		var orientation;
		
		while (1){
			if (byteString.charCodeAt(head) == 255 & byteString.charCodeAt(head + 1) == 218) {
				break;
			}
			
			if (byteString.charCodeAt(head) == 255 & byteString.charCodeAt(head + 1) == 216) {
				head += 2;
			} else {
				var length = byteString.charCodeAt(head + 2) * 256 + byteString.charCodeAt(head + 3);
				var endPoint = head + length + 2;
				if (byteString.charCodeAt(head) == 255 & byteString.charCodeAt(head + 1) == 225) {
					var segment = byteString.slice(head, endPoint);
					var bigEndian = segment.charCodeAt(10) == 77;
					var count;
					if (bigEndian) {
						count = segment.charCodeAt(18) * 256 + segment.charCodeAt(19);
					} else {
						count = segment.charCodeAt(18) + segment.charCodeAt(19) * 256;
					}
					for (var i=0; i < count; i++){
						var field = segment.slice(20 + 12 * i, 32 + 12 * i);
						if ((bigEndian && field.charCodeAt(1) == 18) || (!bigEndian && field.charCodeAt(0) == 18)) {
							orientation = bigEndian ? field.charCodeAt(9) : field.charCodeAt(8);
						}
					}
					break;
				}
				head = endPoint;
			}
			
			if (head > byteString.length){
				break;
			}
		}
		return orientation;
		
	};
};
