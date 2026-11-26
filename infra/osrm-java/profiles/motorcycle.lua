-- Kalceria Java-Island Motorcycle Profile for OSRM (v5.27+)
-- Strictly excludes Indonesian toll roads (motorway / motorway_link / toll=yes)
-- while allowing residential streets, alleys, and urban arterial filtering.

api_version = 4

Set = require('lib/set')
Sequence = require('lib/sequence')
Handlers = require('lib/way_handlers')
Relations = require('lib/relations')
find_access_tag = require('lib/access').find_access_tag
limit = require('lib/maxspeed').limit

function setup()
  return {
    properties = {
      max_speed_for_map_matching      = 120 / 3.6,
      weight_name                     = 'routability',
      process_call_tagless_node       = false,
      u_turn_penalty                  = 15,
      continue_straight_at_waypoint   = true,
      use_turn_restrictions           = true,
      left_hand_driving               = true, -- Indonesia drives on the LEFT!
      traffic_light_penalty           = 2,
    },

    default_mode              = mode.driving,
    default_speed             = 28,
    oneway_handling           = true,
    turn_penalty              = 5,
    turn_bias                 = 1.05,

    access_tag_whitelist = Set {
      'yes',
      'motorcycle',
      'motor_vehicle',
      'vehicle',
      'permissive',
      'designated',
    },

    access_tag_blacklist = Set {
      'no',
      'private',
      'agricultural',
      'forestry',
      'emergency',
      'psv',
      'bus',
      'delivery',
    },

    access_tags_hierarchy = Sequence {
      'motorcycle',
      'motor_vehicle',
      'vehicle',
      'access',
    },

    -- Indonesian motorcycles are STRICTLY banned from toll highways (motorway)
    speeds = Sequence {
      highway = {
        trunk           = 55,
        trunk_link      = 35,
        primary         = 48,
        primary_link    = 32,
        secondary       = 42,
        secondary_link  = 28,
        tertiary        = 36,
        tertiary_link   = 25,
        unclassified    = 28,
        residential     = 24,
        living_street   = 18,
        service         = 16,
        track           = 12,
      }
    },

    surface_speeds = {
      asphalt = nil,
      concrete = nil,
      paved = nil,
      compacted = 22,
      gravel = 18,
      unpaved = 16,
      dirt = 14,
    },
  }
end

function process_node(profile, node, result, relations)
  local access = find_access_tag(node, profile.access_tags_hierarchy)
  if access and profile.access_tag_blacklist[access] then
    result.barrier = true
  end
  local hw = node:get_value_by_key('highway')
  if hw == 'traffic_signals' then
    result.traffic_lights = true
  end
end

function process_way(profile, way, result, relations)
  local highway = way:get_value_by_key('highway')
  if not highway then return end

  -- Hard ban on toll highways & motorways (Jalan Tol Indonesia)
  if highway == 'motorway' or highway == 'motorway_link' then return end
  local toll = way:get_value_by_key('toll')
  if toll == 'yes' then return end
  local moto = way:get_value_by_key('motorcycle')
  if moto == 'no' then return end

  local access = find_access_tag(way, profile.access_tags_hierarchy)
  if access and profile.access_tag_blacklist[access] then return end

  local speed = profile.speeds.highway[highway]
  if not speed then return end

  local surface = way:get_value_by_key('surface')
  if surface and profile.surface_speeds[surface] then
    speed = math.min(speed, profile.surface_speeds[surface])
  end

  result.forward_mode = profile.default_mode
  result.backward_mode = profile.default_mode
  result.forward_speed = speed
  result.backward_speed = speed

  local oneway = way:get_value_by_key('oneway')
  if oneway == 'yes' or oneway == '1' or oneway == 'true' then
    result.backward_mode = mode.inaccessible
  elseif oneway == '-1' then
    result.forward_mode = mode.inaccessible
  end

  local name = way:get_value_by_key('name')
  if name then result.name = name end
end

function process_turn(profile, turn)
  turn.duration = 0
  if turn.has_traffic_light then
    turn.duration = profile.properties.traffic_light_penalty
  end
  if turn.is_u_turn then
    turn.duration = turn.duration + profile.properties.u_turn_penalty
  end
  turn.weight = turn.duration
end

return {
  setup = setup,
  process_way = process_way,
  process_node = process_node,
  process_turn = process_turn,
}

