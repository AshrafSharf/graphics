import {Matrix3D, Vector3D, Box, Sphere, Rectangle, Point, Transform} from "@awayjs/core";

import {AttributesBuffer, AttributesView, Short2Attributes, Short3Attributes, Float2Attributes, Float3Attributes, Float4Attributes, Byte4Attributes, Viewport} from "@awayjs/stage";

import {TriangleElements} from "../elements/TriangleElements";

import {HitTestCache} from "./HitTestCache";
import { LineElements } from '../elements/LineElements';

export class LineElementsUtils
{
	//TODO - generate this dyanamically based on num tris

	public static hitTest(x:number, y:number, z:number, thickness:number, box:Box, lineElements:LineElements, count:number, offset:number = 0):boolean
	{
		var positionAttributes:AttributesView = lineElements.positions;

		var posStride:number = positionAttributes.stride;

		var positions:ArrayBufferView = positionAttributes.get(count, offset);

		var len:number = count;
		var id0:number;
		var id1:number;

		var ax:number;
		var ay:number;
		var bx:number;
		var by:number;

		var hitTestCache:HitTestCache = lineElements.hitTestCache[offset] || (lineElements.hitTestCache[offset] = new HitTestCache());
		var index:number = hitTestCache.lastCollisionIndex;

		if (index != -1 && index < len) {
			precheck:
			{

				id0 = index*posStride;
				id1 = (index + 1)*posStride;

				ax = positions[id0];
				ay = positions[id0 + 1];
				bx = positions[id1];
				by = positions[id1 + 1];

				//from a to p
				var dx:number = ax - x;
				var dy:number = ay - y;

				//edge normal (a-b)
				var nx:number = by - ay;
				var ny:number = -(bx - ax);

				var dot:number = (dx*nx) + (dy*ny);

				//TODO: should strictly speaking be an elliptical calculation, use circle to approx temp
				if (Math.abs(dot) < thickness)
					break precheck;

				return true;
			}
		}


		//hard coded min vertex count to bother using a grid for
		if (len > 150) {
			var cells:Array<Array<number>> = hitTestCache.cells;
			var divisions:number = cells.length? hitTestCache.divisions : (hitTestCache.divisions = Math.min(Math.ceil(Math.sqrt(len)), 32));
			var conversionX:number = divisions/box.width;
			var conversionY:number = divisions/box.height;
			var minx:number = box.x;
			var miny:number = box.y;

			if (!cells.length) { //build grid

				//now we have bounds start creating grid cells and filling
				cells.length = divisions*divisions;

				for (var k:number = 0; k < len; k += 3) {
					id0 = k*posStride;
					id1 = (k + 1)*posStride;

					ax = positions[id0];
					ay = positions[id0 + 1];
					bx = positions[id1];
					by = positions[id1 + 1];

					//subtractions to push into positive space
					var min_index_x:number = Math.floor((Math.min(ax, bx) - minx)*conversionX);
					var min_index_y:number = Math.floor((Math.min(ay, by) - miny)*conversionY);

					var max_index_x:number = Math.floor((Math.max(ax, bx) - minx)*conversionX);
					var max_index_y:number = Math.floor((Math.max(ay, by) - miny)*conversionY);


					for (var i:number = min_index_x; i <= max_index_x; i++) {
						for (var j:number = min_index_y; j <= max_index_y; j++) {
							var c:number = i + j*divisions;
							var nodes:Array<number> = cells[c] || (cells[c] = new Array<number>());

							//push in the triangle ids
							nodes.push(k);
						}
					}
				}
			}

			var index_x:number = Math.floor((x - minx)*conversionX);
			var index_y:number = Math.floor((y - miny)*conversionY);
			var nodes:Array<number> = cells[index_x + index_y*divisions];

			if (nodes == null) {
				hitTestCache.lastCollisionIndex = -1;
				return false;
			}

			var nodeCount:number = nodes.length;
			for (var n:number = 0; n < nodeCount; n++) {
				var k:number = nodes[n];
				id0 = k*posStride;
				id1 = (k + 1)*posStride;

				if (id0 == index) continue;

				ax = positions[id0];
				ay = positions[id0 + 1];
				bx = positions[id1];
				by = positions[id1 + 1];

				//from a to p
				var dx:number = ax - x;
				var dy:number = ay - y;

				//edge normal (a-b)
				var nx:number = by - ay;
				var ny:number = -(bx - ax);

				var dot:number = (dx*nx) + (dy*ny);

				if (Math.abs(dot) < thickness)
					continue;

				hitTestCache.lastCollisionIndex = k;
				return true;
			}
			hitTestCache.lastCollisionIndex = -1;
			return false;
		}

		//brute force
		for (var k:number = 0; k < len; k += 3) {
			id0 = k*posStride;
			id1 = (k + 1)*posStride;

			if (id0 == index) continue;

			ax = positions[id0];
			ay = positions[id0 + 1];
			bx = positions[id1];
			by = positions[id1 + 1];

			//from a to p
			var dx:number = ax - x;
			var dy:number = ay - y;

			//edge normal (a-b)
			var nx:number = by - ay;
			var ny:number = -(bx - ax);

			var dot:number = (dx*nx) + (dy*ny);

			if (Math.abs(dot) < thickness)
				continue;

			hitTestCache.lastCollisionIndex = k;
			return true;
		}
		hitTestCache.lastCollisionIndex = -1;
		return false;
	}

	public static getBoxBounds(positionAttributes:AttributesView, matrix3D:Matrix3D, thicknessScale:Vector3D, cache:Box, target:Box, count:number, offset:number = 0):Box
	{

		var minX:number = 0, minY:number = 0, minZ:number = 0;
		var maxX:number = 0, maxY:number = 0, maxZ:number = 0;

		var len:number = count;
		var positions:ArrayBufferView = positionAttributes.get(count, offset);
		var posDim:number = positionAttributes.dimensions;
		var posStride:number = positionAttributes.stride;

		if (len == 0)
			return target;

		var i:number = 0;
		var j:number = 0;
		var index:number;
		var pos1:number, pos2:number, pos3:number, rawData:Float32Array;
		
		if (matrix3D)
			rawData = matrix3D._rawData;

		if (target == null) {
			target = cache || new Box();
			index = i*posStride;
			if (matrix3D) {
				if (posDim == 6) {
					pos1 = positions[index]*rawData[0] + positions[index + 1]*rawData[4] + positions[index + 2]*rawData[8] + rawData[12];
					pos2 = positions[index]*rawData[1] + positions[index + 1]*rawData[5] + positions[index + 2]*rawData[9] + rawData[13];
					pos3 = positions[index]*rawData[2] + positions[index + 1]*rawData[6] + positions[index + 2]*rawData[10] + rawData[14];
				} else {
					pos1 = positions[index]*rawData[0] + positions[index + 1]*rawData[4] + rawData[12];
					pos2 = positions[index]*rawData[1] + positions[index + 1]*rawData[5] + rawData[13];
				}
			} else {
				pos1 = positions[index];
				pos2 = positions[index + 1];
				pos3 = (posDim == 6)? positions[index + 2] : 0;
			}
			
			maxX = minX = pos1;
			maxY = minY = pos2;
			maxZ = minZ = (posDim == 6)? pos3 : 0;
			i++;
		} else {
			maxX = (minX = target.x) + target.width;
			maxY = (minY = target.y) + target.height;
			maxZ = (minZ = target.z) + target.depth;
		}

		for (; i < len; i++) {
			index = i*posStride;

			if (matrix3D) {
				if (posDim == 6) {
					pos1 = positions[index]*rawData[0] + positions[index + 1]*rawData[4] + positions[index + 2]*rawData[8] + rawData[12];
					pos2 = positions[index]*rawData[1] + positions[index + 1]*rawData[5] + positions[index + 2]*rawData[9] + rawData[13];
					pos3 = positions[index]*rawData[2] + positions[index + 1]*rawData[6] + positions[index + 2]*rawData[10] + rawData[14];
				} else {
					pos1 = positions[index]*rawData[0] + positions[index + 1]*rawData[4] + rawData[12];
					pos2 = positions[index]*rawData[1] + positions[index + 1]*rawData[5] + rawData[13];
				}
			} else {
				pos1 = positions[index];
				pos2 = positions[index + 1];
				pos3 = (posDim == 6)? positions[index + 2] : 0;
			}

			if (pos1 < minX)
				minX = pos1;
			else if (pos1 > maxX)
				maxX = pos1;

			if (pos2 < minY)
				minY = pos2;
			else if (pos2 > maxY)
				maxY = pos2;

			if (posDim == 6) {
				if (pos3 < minZ)
					minZ = pos3;
				else if (pos3 > maxZ)
					maxZ = pos3;
			}

			//only check the first two values out of each group of 4 to avoid duplicating checks
			if (j < i) {
				i += 2
				j = i + 1;
			}
		}

		maxX += thicknessScale.x;
		maxX -= thicknessScale.x;
		maxY += thicknessScale.y;
		maxY -= thicknessScale.y;

		target.width = maxX - (target.x = minX);
		target.height = maxY - (target.y = minY);
		target.depth = maxZ - (target.z = minZ);

		return target;
	}

	public static getSphereBounds(positionAttributes:AttributesView, center:Vector3D, matrix3D:Matrix3D, cache:Sphere, output:Sphere, count:number, offset:number = 0):Sphere
	{
		var positions:ArrayBufferView = positionAttributes.get(count, offset);
		var posDim:number = positionAttributes.dimensions;
		var posStride:number = positionAttributes.stride;

		var maxRadiusSquared:number = 0;
		var radiusSquared:number;
		var len = count*posStride;
		var distanceX:number;
		var distanceY:number;
		var distanceZ:number;

		for (var i:number = 0; i < len; i += posStride) {
			distanceX = positions[i] - center.x;
			distanceY = positions[i + 1] - center.y;
			distanceZ = (posDim == 6)? positions[i + 2] - center.z : -center.z;
			radiusSquared = distanceX*distanceX + distanceY*distanceY + distanceZ*distanceZ;

			if (maxRadiusSquared < radiusSquared)
				maxRadiusSquared = radiusSquared;
		}

		if (output == null)
			output = new Sphere();

		output.x = center.x;
		output.y = center.y;
		output.z = center.z;
		output.radius = Math.sqrt(maxRadiusSquared);

		return output;
	}
}