import math
from itertools import combinations
import json # Ensure json is imported for the final output

# --- 定义基础系统组件 ---
DC_CONTAINER_SPECS = {
    "ST5015UX_5MW_0R": {"family": "5MW", "capacity_mwh": 5.000, "base_clusters": 12, "reduced_clusters": 0, "name_cn": "5MWh标准电池舱(不减簇)"},
    "ST5015UX_5MW_1R": {"family": "5MW", "capacity_mwh": 4.598, "base_clusters": 12, "reduced_clusters": 1, "name_cn": "5MWh标准电池舱(减1簇)"},
    "ST5015UX_5MW_2R": {"family": "5MW", "capacity_mwh": 4.180, "base_clusters": 12, "reduced_clusters": 2, "name_cn": "5MWh标准电池舱(减2簇)"},
    "ST5015UX_5MW_3R": {"family": "5MW", "capacity_mwh": 3.762, "base_clusters": 12, "reduced_clusters": 3, "name_cn": "5MWh标准电池舱(减3簇)"},
    "ST5015UX_5MW_4R": {"family": "5MW", "capacity_mwh": 3.344, "base_clusters": 12, "reduced_clusters": 4, "name_cn": "5MWh标准电池舱(减4簇)"},
    "ST7523UX_7_5MW_0R": {"family": "7.5MW", "capacity_mwh": 7.5225, "base_clusters": 18, "reduced_clusters": 0, "name_cn": "7.5MWh标准电池舱(不减簇)"},
    "ST7523UX_7_5MW_2R": {"family": "7.5MW", "capacity_mwh": 6.686, "base_clusters": 18, "reduced_clusters": 2, "name_cn": "7.5MWh标准电池舱(减2簇)"},
    "ST7523UX_7_5MW_4R": {"family": "7.5MW", "capacity_mwh": 5.851, "base_clusters": 18, "reduced_clusters": 4, "name_cn": "7.5MWh标准电池舱(减4簇)"},
    "ST7523UX_7_5MW_6R": {"family": "7.5MW", "capacity_mwh": 5.015, "base_clusters": 18, "reduced_clusters": 6, "name_cn": "7.5MWh标准电池舱(减6簇)"},
}

PCS_SPECS = {
    "PCS_5MW": {"power_mw": 5.0, "cost_eq_mwh": 1.25, "name_cn": "5MW逆变升压一体舱"},
    "PCS_7_5MW": {"power_mw": 7.5, "cost_eq_mwh": 1.875, "name_cn": "7.5MW逆变升压一体舱"},
    "PCS_2_5MW": {"power_mw": 2.5, "cost_eq_mwh": 0.625, "name_cn": "2.5MW逆变升压一体舱"}  # V3.1新增
}

ALL_DC_SPEC_KEYS = list(DC_CONTAINER_SPECS.keys())
EPSILON = 1e-9

# V3.0: 成本单价定义表（元/Wh）
UNIT_PRICE_TABLE = {
    2: {  # 2h系统
        "7.5MW": 0.46,
        "5MW": 0.51
    },
    4: {  # 4h系统
        "7.5MW": 0.41,
        "5MW": 0.43
    },
    6: {  # 6h系统
        "7.5MW": 0.41,
        "5MW": 0.43
    }
}

def get_dc_spec_by_name(name):
    return DC_CONTAINER_SPECS[name]

def get_pcs_spec_by_name(name):
    return PCS_SPECS[name]

def get_unit_price(system_hour_type, dc_family):
    """
    获取单价（元/Wh）
    
    Args:
        system_hour_type: 系统时长类型 (2, 4, 6)
        dc_family: 电池舱家族 ("5MW" 或 "7.5MW")
    
    Returns:
        float: 单价（元/Wh），如果未定义则返回None
    """
    if system_hour_type not in UNIT_PRICE_TABLE:
        return None
    return UNIT_PRICE_TABLE[system_hour_type].get(dc_family)

def calculate_project_duration_type(project_power_mw, project_capacity_mwh):
    if project_power_mw <= EPSILON:
        return 0, 8  # 默认改为8h类型
    duration_hours = project_capacity_mwh / project_power_mw
    system_hour_type = 8  # 默认为8h类型
    if duration_hours <= 1.5 + EPSILON:
        system_hour_type = 1
    elif duration_hours <= 3.0 + EPSILON:
        system_hour_type = 2
    elif duration_hours <= 5.0 + EPSILON:
        system_hour_type = 4
    elif duration_hours <= 7.0 + EPSILON:
        system_hour_type = 6
    # 其他情况（>7.0小时）默认为8h类型
    return duration_hours, system_hour_type

# --- 辅助函数定义 (从第一个文件迁移) ---
def get_pcs_configuration_summary_map(blocks_config_list):
    pcs_counts_map = {"PCS_5MW": 0, "PCS_7_5MW": 0, "PCS_2_5MW": 0}  # V3.1: 新增PCS_2_5MW
    if blocks_config_list: # blocks_config_list is like [(count, block_data), ...]
        for num_blocks, block_data in blocks_config_list:
            pcs_name = block_data["pcs_name"]
            pcs_counts_map[pcs_name] = pcs_counts_map.get(pcs_name, 0) + num_blocks
    return pcs_counts_map

def get_total_physical_dc_containers_count(blocks_config_list):
    total_physical_dc_count = 0
    if blocks_config_list: # blocks_config_list is like [(count, block_data), ...]
        for num_blocks_of_this_type, block_data in blocks_config_list:
            num_dc_per_block_unit = 0
            if block_data.get("dc_containers_detail_list"):
                for dc_detail in block_data["dc_containers_detail_list"]:
                    num_dc_per_block_unit += dc_detail["count"]
            total_physical_dc_count += num_blocks_of_this_type * num_dc_per_block_unit
    return total_physical_dc_count

def generate_single_ess_block_configs(global_dc_spec_names, system_hour_type, project_duration_hours, target_dc_family_filter):
    ess_blocks = []
    
    # V2.29 & V3.1: 6h系统特殊处理 - 允许5MW PCS和2.5MW PCS
    if system_hour_type == 6:
        # 6h系统允许使用5MW PCS（最多4个电池舱）和2.5MW PCS（V3.1新增，7.5MW家族专用）
        if target_dc_family_filter == "7.5MW":
            # === 配置1：5MW PCS（原有逻辑）===
            pcs_spec = PCS_SPECS["PCS_5MW"]
            pcs_name = "PCS_5MW"
            pcs_power = pcs_spec["power_mw"]
            pcs_cost = pcs_spec["cost_eq_mwh"]
            
            # 6h系统特有约束：5MW PCS最多4个电池舱
            max_n_dc_on_pcs = 4  # 6h系统的5MW PCS限制为4个电池舱
            
            # 按照常规逻辑配置电池舱，但只使用5MW PCS
            for n_dc_on_pcs in range(1, max_n_dc_on_pcs + 1):
                valid_global_dc_names_for_current_family = [name for name in global_dc_spec_names if get_dc_spec_by_name(name)["family"] == target_dc_family_filter]
                if not valid_global_dc_names_for_current_family: continue
                
                dc_container_combinations_for_n = []
                if len(valid_global_dc_names_for_current_family) == 1:
                    spec1_name = valid_global_dc_names_for_current_family[0]
                    dc_container_combinations_for_n.append([(n_dc_on_pcs, spec1_name)])
                elif len(valid_global_dc_names_for_current_family) == 2:
                    spec1_name = valid_global_dc_names_for_current_family[0]
                    spec2_name = valid_global_dc_names_for_current_family[1]
                    for i in range(n_dc_on_pcs + 1):
                        num_spec1 = i
                        num_spec2 = n_dc_on_pcs - i
                        current_combo_list = []
                        if num_spec1 > 0: current_combo_list.append((num_spec1, spec1_name))
                        if num_spec2 > 0: current_combo_list.append((num_spec2, spec2_name))
                        if current_combo_list: dc_container_combinations_for_n.append(current_combo_list)
                
                for dc_combo_details_list in dc_container_combinations_for_n:
                    current_block_dc_capacity = 0
                    actual_dc_components_desc = []
                    actual_dc_components_list_for_block = []
                    
                    for num_dc, dc_name in dc_combo_details_list:
                        dc_spec = get_dc_spec_by_name(dc_name)
                        current_block_dc_capacity += num_dc * dc_spec["capacity_mwh"]
                        actual_dc_components_desc.append(f'{num_dc}x{dc_spec.get("name_cn", dc_name)}')
                        actual_dc_components_list_for_block.append({
                            "name": dc_name, 
                            "count": num_dc, 
                            "capacity_per_unit": dc_spec["capacity_mwh"], 
                            "name_cn": dc_spec.get("name_cn", dc_name)
                        })
                    
                    current_block_dc_capacity = round(current_block_dc_capacity, 3)
                    
                    # 硬约束检查：功率不能超过PCS容量
                    can_form_block_based_on_power = False
                    if system_hour_type > EPSILON: 
                        required_avg_power_for_block = current_block_dc_capacity / system_hour_type
                        pcs_power_limit_with_tolerance = pcs_power * 1.01 
                        if required_avg_power_for_block <= pcs_power_limit_with_tolerance + EPSILON: 
                            can_form_block_based_on_power = True
                    elif abs(current_block_dc_capacity) < EPSILON: 
                        can_form_block_based_on_power = True
                    
                    if can_form_block_based_on_power:
                        # V3.0: 计算等效容量和真实成本
                        block_equivalent_capacity = round(pcs_cost + current_block_dc_capacity, 3)
                        # 单价根据系统时长和DC家族确定，这里先使用等效容量，稍后转换
                        block_desc_str = f"{pcs_spec.get('name_cn',pcs_name)} + {n_dc_on_pcs}电池舱 ({'; '.join(actual_dc_components_desc)})"
                        ess_blocks.append({
                            "pcs_name": pcs_name, 
                            "pcs_name_cn": pcs_spec.get('name_cn',pcs_name),
                            "pcs_power_mw": pcs_power, 
                            "dc_containers_detail_list": actual_dc_components_list_for_block, 
                            "block_dc_capacity_mwh": current_block_dc_capacity, 
                            "block_equivalent_capacity_mwh": block_equivalent_capacity,  # V3.0: 改名
                            "block_description": block_desc_str
                        })
            
            # === 配置2：2.5MW PCS（V3.1新增）===
            # 6h系统：2.5MW + 2个7.5MWh（不减簇）
            pcs_spec_2_5 = PCS_SPECS["PCS_2_5MW"]
            pcs_name_2_5 = "PCS_2_5MW"
            pcs_power_2_5 = pcs_spec_2_5["power_mw"]
            pcs_cost_2_5 = pcs_spec_2_5["cost_eq_mwh"]
            
            # 查找不减簇电池舱
            dc_spec_0r = "ST7523UX_7_5MW_0R"
            if dc_spec_0r in global_dc_spec_names:
                dc_spec_info = get_dc_spec_by_name(dc_spec_0r)
                # 2个不减簇电池舱
                num_dc_2_5 = 2
                current_block_dc_capacity_2_5 = num_dc_2_5 * dc_spec_info["capacity_mwh"]
                current_block_dc_capacity_2_5 = round(current_block_dc_capacity_2_5, 3)
                
                # 功率检查
                can_form_block = False
                if system_hour_type > EPSILON:
                    required_avg_power = current_block_dc_capacity_2_5 / system_hour_type
                    pcs_power_limit = pcs_power_2_5 * 1.01
                    if required_avg_power <= pcs_power_limit + EPSILON:
                        can_form_block = True
                
                if can_form_block:
                    block_equivalent_capacity_2_5 = round(pcs_cost_2_5 + current_block_dc_capacity_2_5, 3)
                    actual_dc_components_list_2_5 = [{
                        "name": dc_spec_0r,
                        "count": num_dc_2_5,
                        "capacity_per_unit": dc_spec_info["capacity_mwh"],
                        "name_cn": dc_spec_info.get("name_cn", dc_spec_0r)
                    }]
                    block_desc_str_2_5 = f"{pcs_spec_2_5.get('name_cn',pcs_name_2_5)} + {num_dc_2_5}电池舱 ({num_dc_2_5}x{dc_spec_info.get('name_cn', dc_spec_0r)})"
                    
                    ess_blocks.append({
                        "pcs_name": pcs_name_2_5,
                        "pcs_name_cn": pcs_spec_2_5.get('name_cn', pcs_name_2_5),
                        "pcs_power_mw": pcs_power_2_5,
                        "dc_containers_detail_list": actual_dc_components_list_2_5,
                        "block_dc_capacity_mwh": current_block_dc_capacity_2_5,
                        "block_equivalent_capacity_mwh": block_equivalent_capacity_2_5,
                        "block_description": block_desc_str_2_5
                    })
        
        # 6h系统只返回5MW和2.5MW PCS的配置，不继续执行其他逻辑
        return ess_blocks
    
    # 其他系统时长的原有逻辑完全保持不变
    # 按照常规逻辑处理所有系统时长类型
    for pcs_name, pcs_spec in PCS_SPECS.items():
        pcs_power = pcs_spec["power_mw"]; pcs_cost = pcs_spec["cost_eq_mwh"]; max_n_dc_on_pcs = system_hour_type 
        initial_compatibility = False
        if pcs_name == "PCS_5MW":
            if target_dc_family_filter == "5MW" or target_dc_family_filter == "7.5MW": initial_compatibility = True
        elif pcs_name == "PCS_7_5MW":
            if target_dc_family_filter == "7.5MW": initial_compatibility = True
        if not initial_compatibility: continue
        for n_dc_on_pcs in range(1, max_n_dc_on_pcs + 1):
            valid_global_dc_names_for_current_family = [name for name in global_dc_spec_names if get_dc_spec_by_name(name)["family"] == target_dc_family_filter]
            if not valid_global_dc_names_for_current_family: continue
            dc_container_combinations_for_n = []
            if len(valid_global_dc_names_for_current_family) == 1:
                spec1_name = valid_global_dc_names_for_current_family[0]
                dc_container_combinations_for_n.append([(n_dc_on_pcs, spec1_name)])
            elif len(valid_global_dc_names_for_current_family) == 2:
                spec1_name = valid_global_dc_names_for_current_family[0]; spec2_name = valid_global_dc_names_for_current_family[1]
                for i in range(n_dc_on_pcs + 1):
                    num_spec1 = i; num_spec2 = n_dc_on_pcs - i; current_combo_list = []
                    if num_spec1 > 0: current_combo_list.append((num_spec1, spec1_name))
                    if num_spec2 > 0: current_combo_list.append((num_spec2, spec2_name))
                    if current_combo_list: dc_container_combinations_for_n.append(current_combo_list)
            for dc_combo_details_list in dc_container_combinations_for_n:
                current_block_dc_capacity = 0; actual_dc_components_desc = []; actual_dc_components_list_for_block = []
                for num_dc, dc_name in dc_combo_details_list:
                    dc_spec = get_dc_spec_by_name(dc_name)
                    current_block_dc_capacity += num_dc * dc_spec["capacity_mwh"]
                    actual_dc_components_desc.append(f'{num_dc}x{dc_spec.get("name_cn", dc_name)}')
                    actual_dc_components_list_for_block.append({"name": dc_name, "count": num_dc, "capacity_per_unit": dc_spec["capacity_mwh"], "name_cn": dc_spec.get("name_cn", dc_name)})
                current_block_dc_capacity = round(current_block_dc_capacity, 3)
                can_form_block_based_on_power = False
                if system_hour_type > EPSILON: 
                    required_avg_power_for_block = current_block_dc_capacity / system_hour_type
                    pcs_power_limit_with_tolerance = pcs_power * 1.01 
                    if required_avg_power_for_block <= pcs_power_limit_with_tolerance + EPSILON: can_form_block_based_on_power = True
                elif abs(current_block_dc_capacity) < EPSILON: can_form_block_based_on_power = True
                if can_form_block_based_on_power:
                    # V3.0: 计算等效容量
                    block_equivalent_capacity = round(pcs_cost + current_block_dc_capacity, 3)
                    block_desc_str = f"{pcs_spec.get('name_cn',pcs_name)} + {n_dc_on_pcs}电池舱 ({'; '.join(actual_dc_components_desc)})"
                    ess_blocks.append({
                        "pcs_name": pcs_name, "pcs_name_cn": pcs_spec.get('name_cn',pcs_name),
                        "pcs_power_mw": pcs_power, 
                        "dc_containers_detail_list": actual_dc_components_list_for_block,
                        "block_dc_capacity_mwh": current_block_dc_capacity,
                        "block_equivalent_capacity_mwh": block_equivalent_capacity,  # V3.0: 改名
                        "block_description": block_desc_str
                    })
    
    # V3.1: 为7.5MW家族添加2.5MW PCS的固定配置（2h和4h系统）
    if target_dc_family_filter == "7.5MW" and system_hour_type in [2, 4]:
        pcs_spec_2_5 = PCS_SPECS["PCS_2_5MW"]
        pcs_name_2_5 = "PCS_2_5MW"
        pcs_power_2_5 = pcs_spec_2_5["power_mw"]
        pcs_cost_2_5 = pcs_spec_2_5["cost_eq_mwh"]
        
        # 查找减6簇电池舱
        dc_spec_6r = "ST7523UX_7_5MW_6R"
        if dc_spec_6r in global_dc_spec_names:
            dc_spec_info = get_dc_spec_by_name(dc_spec_6r)
            
            if system_hour_type == 2:
                # 2h系统：2.5MW + 1个减6簇
                num_dc = 1
            elif system_hour_type == 4:
                # 4h系统：2.5MW + 2个减6簇
                num_dc = 2
            else:
                num_dc = 0
            
            if num_dc > 0:
                current_block_dc_capacity = num_dc * dc_spec_info["capacity_mwh"]
                current_block_dc_capacity = round(current_block_dc_capacity, 3)
                
                # 功率检查
                can_form_block = False
                if system_hour_type > EPSILON:
                    required_avg_power = current_block_dc_capacity / system_hour_type
                    pcs_power_limit = pcs_power_2_5 * 1.01
                    if required_avg_power <= pcs_power_limit + EPSILON:
                        can_form_block = True
                
                if can_form_block:
                    block_equivalent_capacity = round(pcs_cost_2_5 + current_block_dc_capacity, 3)
                    actual_dc_components_list = [{
                        "name": dc_spec_6r,
                        "count": num_dc,
                        "capacity_per_unit": dc_spec_info["capacity_mwh"],
                        "name_cn": dc_spec_info.get("name_cn", dc_spec_6r)
                    }]
                    block_desc_str = f"{pcs_spec_2_5.get('name_cn',pcs_name_2_5)} + {num_dc}电池舱 ({num_dc}x{dc_spec_info.get('name_cn', dc_spec_6r)})"
                    
                    ess_blocks.append({
                        "pcs_name": pcs_name_2_5,
                        "pcs_name_cn": pcs_spec_2_5.get('name_cn', pcs_name_2_5),
                        "pcs_power_mw": pcs_power_2_5,
                        "dc_containers_detail_list": actual_dc_components_list,
                        "block_dc_capacity_mwh": current_block_dc_capacity,
                        "block_equivalent_capacity_mwh": block_equivalent_capacity,
                        "block_description": block_desc_str
                    })
    
    return ess_blocks

def find_best_combination_of_ess_blocks(project_power_mw, project_capacity_mwh, available_ess_blocks, system_hour_type, target_dc_family, max_device_sets=100):
    # V3.0: 获取单价
    unit_price = get_unit_price(system_hour_type, target_dc_family)
    if unit_price is None:
        # 如果没有定义单价，返回错误
        return {
            "cost": float('inf'), "power": 0, "capacity": 0, "blocks_config": [], 
            "block_details_for_message": [], "block_details_for_display": [], 
            "user_limit_warning": f"系统时长类型{system_hour_type}h和DC家族{target_dc_family}的单价未定义", 
            "total_dc_containers_calc": float('inf')
        }
    
    best_solution = {
        "cost": float('inf'), "power": 0, "capacity": 0, "blocks_config": [], 
        "block_details_for_message": [], "block_details_for_display": [], "user_limit_warning": "", "total_dc_containers_calc": float('inf')
    }
    if abs(project_power_mw) < EPSILON and abs(project_capacity_mwh) < EPSILON: 
        best_solution["cost"] = 0; best_solution["total_dc_containers_calc"] = 0; return best_solution
    if not available_ess_blocks: return best_solution
    
    min_block_power_val = float('inf'); has_positive_power_block = False
    for b in available_ess_blocks:
        if b["pcs_power_mw"] > EPSILON: min_block_power_val = min(min_block_power_val, b["pcs_power_mw"]); has_positive_power_block = True
    min_block_power = min_block_power_val if has_positive_power_block else 5.0 
    
    # 获取系统时长类型用于动态优化
    duration_hours, system_hour_type = calculate_project_duration_type(project_power_mw, project_capacity_mwh)
    
    min_calc_blocks_p_for_power_ref = 0 
    if project_power_mw > EPSILON and min_block_power > EPSILON: min_calc_blocks_p_for_power_ref = math.ceil(project_power_mw / min_block_power)
    loop_start = max(1, 1)
    if project_power_mw <= EPSILON and project_capacity_mwh <= EPSILON: loop_start = 0
    
    default_loop_end = (min_calc_blocks_p_for_power_ref if min_calc_blocks_p_for_power_ref > 0 else 0) + 4 
    default_loop_end = min(default_loop_end, max_device_sets)  # 使用用户指定的最大设备套数限制

    if project_power_mw <= EPSILON and project_capacity_mwh > EPSILON: default_loop_end = min(4, max_device_sets)  # 应用用户限制
    elif project_power_mw <= EPSILON and project_capacity_mwh <= EPSILON: default_loop_end = 0
    
    loop_end = default_loop_end
    if loop_start > default_loop_end : loop_end = loop_start 
    loop_end = min(loop_end, max_device_sets)  # 再次确保不超过用户限制

    if loop_end == 0 and loop_start == 0 and abs(project_power_mw) < EPSILON and abs(project_capacity_mwh) < EPSILON: pass 
    elif loop_end == 0 and (project_power_mw > EPSILON or project_capacity_mwh > EPSILON):
        best_solution["user_limit_warning"] = "由于套数限制或无可用单元块，无法进行有效搜索。"
        return best_solution
    
    # V2.25: 动态性能优化 - 根据系统时长类型决定S3搜索上限
    s3_max_sets = 10  # Default
    if system_hour_type == 1:
        s3_max_sets = 200
    elif system_hour_type == 2:
        s3_max_sets = 60
    elif system_hour_type == 4:
        s3_max_sets = 20
    elif system_hour_type == 6:
        s3_max_sets = 10
    elif system_hour_type >= 8:
        s3_max_sets = 5
        
    # V3.0: 内部成本平衡阈值改为动态计算（万元）
    INTERNAL_COST_TIE_EPSILON = 0.01 * 100 * unit_price  # 0.01 MWh × 100 × 单价

    def _calculate_actual_power_output(blocks_config):
        """计算考虑PCS和直流容量双重约束的实际功率输出"""
        total_actual_power = 0
        for num_blocks, block_data in blocks_config:
            # 获取单个块的参数
            pcs_rated_power = block_data["pcs_power_mw"]
            block_dc_capacity = block_data["block_dc_capacity_mwh"]
            
            # 统一公式：min(PCS额定功率, 直流容量÷系统时长)
            duration_hours, system_hour_type_calc = calculate_project_duration_type(project_power_mw, project_capacity_mwh)
            if system_hour_type_calc > EPSILON:
                dc_limited_power = block_dc_capacity / system_hour_type_calc
                actual_block_power = min(pcs_rated_power, dc_limited_power)
            else:
                # 特殊情况：系统时长为0时，按PCS额定功率计算
                actual_block_power = pcs_rated_power
            
            total_actual_power += num_blocks * actual_block_power
        
        return round(total_actual_power, 3)

    for num_total_sel_blocks in range(loop_start, loop_end + 1):
        if num_total_sel_blocks == 0 : continue 
        
        def _update_internal_best_solution(cc_cost, cc_power, cc_capacity, cc_blocks_config):
            nonlocal best_solution             
            cc_total_dc_containers = get_total_physical_dc_containers_count(cc_blocks_config)
            is_new_best = False
            if best_solution["cost"] == float('inf'): is_new_best = True
            else:
                if cc_cost < best_solution["cost"] - INTERNAL_COST_TIE_EPSILON: is_new_best = True
                elif cc_cost <= best_solution["cost"] + INTERNAL_COST_TIE_EPSILON: 
                    current_best_dc_in_find_best = best_solution.get("total_dc_containers_calc", float('inf'))
                    if cc_total_dc_containers < current_best_dc_in_find_best: is_new_best = True
                    elif cc_total_dc_containers == current_best_dc_in_find_best: 
                        if cc_cost < best_solution["cost"] - EPSILON: is_new_best = True
                        elif abs(cc_cost - best_solution["cost"]) < EPSILON: 
                            if cc_power < best_solution["power"] - EPSILON: is_new_best = True
            if is_new_best:
                best_solution.update({"cost": cc_cost, "power": cc_power, "capacity": cc_capacity, "blocks_config": cc_blocks_config, "total_dc_containers_calc": cc_total_dc_containers })

        for block_type1 in available_ess_blocks: # Scenario 1
            current_power = num_total_sel_blocks * block_type1["pcs_power_mw"]
            current_capacity = num_total_sel_blocks * block_type1["block_dc_capacity_mwh"]
            # V3.0: 计算真实成本（万元）= 等效容量 × 100 × 单价
            current_equivalent_capacity = num_total_sel_blocks * block_type1["block_equivalent_capacity_mwh"]
            current_cost = current_equivalent_capacity * 100 * unit_price  # 万元
            current_power = round(current_power,3); current_capacity = round(current_capacity,3); current_cost = round(current_cost,2)
            
            # 检查容量约束
            if current_capacity >= project_capacity_mwh - EPSILON:
                current_blocks_config = sorted([(num_total_sel_blocks, block_type1)], key=lambda x:x[1]["block_description"])
                
                # 检查是否包含减簇配置，决定是否应用实际功率约束
                has_reduced_clusters = False
                for dc_detail in block_type1.get("dc_containers_detail_list", []):
                    dc_name = dc_detail["name"]
                    dc_spec = get_dc_spec_by_name(dc_name)
                    if dc_spec["reduced_clusters"] > 0:
                        has_reduced_clusters = True
                        break
                
                if has_reduced_clusters:
                    # 有减簇配置时，检查实际功率输出约束
                    actual_power_output = _calculate_actual_power_output(current_blocks_config)
                    if actual_power_output >= project_power_mw - EPSILON:
                        _update_internal_best_solution(current_cost, current_power, current_capacity, current_blocks_config)
                else:
                    # 无减簇配置时，只需检查额定功率约束
                    if current_power >= project_power_mw - EPSILON:
                        _update_internal_best_solution(current_cost, current_power, current_capacity, current_blocks_config)
        if num_total_sel_blocks >= 2: # Scenario 2
            for i in range(len(available_ess_blocks)):
                block_type1 = available_ess_blocks[i]
                for j in range(i + 1, len(available_ess_blocks)): 
                    block_type2 = available_ess_blocks[j]
                    for num_type1_blocks in range(1, num_total_sel_blocks): 
                        num_type2_blocks = num_total_sel_blocks - num_type1_blocks
                        if num_type2_blocks <= 0: continue 
                        current_power_s2 = (num_type1_blocks * block_type1["pcs_power_mw"] + num_type2_blocks * block_type2["pcs_power_mw"])
                        current_capacity_s2 = (num_type1_blocks * block_type1["block_dc_capacity_mwh"] + num_type2_blocks * block_type2["block_dc_capacity_mwh"])
                        # V3.0: 计算真实成本（万元）
                        current_equivalent_capacity_s2 = (num_type1_blocks * block_type1["block_equivalent_capacity_mwh"] + num_type2_blocks * block_type2["block_equivalent_capacity_mwh"])
                        current_cost_s2 = current_equivalent_capacity_s2 * 100 * unit_price
                        current_power_s2 = round(current_power_s2,3); current_capacity_s2 = round(current_capacity_s2,3); current_cost_s2 = round(current_cost_s2,2)
                        
                        # 检查容量约束
                        if current_capacity_s2 >= project_capacity_mwh - EPSILON:
                            current_blocks_config_s2 = sorted([(num_type1_blocks, block_type1), (num_type2_blocks, block_type2)], key=lambda x: x[1]["block_description"])
                            
                            # 检查是否包含减簇配置，决定是否应用实际功率约束
                            has_reduced_clusters_s2 = False
                            for _, block_data in current_blocks_config_s2:
                                for dc_detail in block_data.get("dc_containers_detail_list", []):
                                    dc_name = dc_detail["name"]
                                    dc_spec = get_dc_spec_by_name(dc_name)
                                    if dc_spec["reduced_clusters"] > 0:
                                        has_reduced_clusters_s2 = True
                                        break
                                if has_reduced_clusters_s2:
                                    break
                            
                            if has_reduced_clusters_s2:
                                # 有减簇配置时，检查实际功率输出约束
                                actual_power_output_s2 = _calculate_actual_power_output(current_blocks_config_s2)
                                if actual_power_output_s2 >= project_power_mw - EPSILON:
                                    _update_internal_best_solution(current_cost_s2, current_power_s2, current_capacity_s2, current_blocks_config_s2)
                            else:
                                # 无减簇配置时，只需检查额定功率约束
                                if current_power_s2 >= project_power_mw - EPSILON:
                                    _update_internal_best_solution(current_cost_s2, current_power_s2, current_capacity_s2, current_blocks_config_s2)
        
        if num_total_sel_blocks >= 3 and num_total_sel_blocks <= s3_max_sets: # V2.25: 使用动态上限
            if len(available_ess_blocks) >= 3 : 
                for block_indices_combo in combinations(range(len(available_ess_blocks)), 3):
                    block_type1 = available_ess_blocks[block_indices_combo[0]]; block_type2 = available_ess_blocks[block_indices_combo[1]]; block_type3 = available_ess_blocks[block_indices_combo[2]]
                    if len(set([block_type1["block_description"], block_type2["block_description"], block_type3["block_description"]])) < 3: continue
                    for n1 in range(1, num_total_sel_blocks - 1): 
                        for n2 in range(1, num_total_sel_blocks - n1): 
                            n3 = num_total_sel_blocks - n1 - n2
                            if n3 >= 1:
                                current_power_s3 = (n1*block_type1["pcs_power_mw"] + n2*block_type2["pcs_power_mw"] + n3*block_type3["pcs_power_mw"])
                                current_capacity_s3 = (n1*block_type1["block_dc_capacity_mwh"] + n2*block_type2["block_dc_capacity_mwh"] + n3*block_type3["block_dc_capacity_mwh"])
                                # V3.0: 计算真实成本（万元）
                                current_equivalent_capacity_s3 = (n1*block_type1["block_equivalent_capacity_mwh"] + n2*block_type2["block_equivalent_capacity_mwh"] + n3*block_type3["block_equivalent_capacity_mwh"])
                                current_cost_s3 = current_equivalent_capacity_s3 * 100 * unit_price
                                current_power_s3 = round(current_power_s3,3); current_capacity_s3 = round(current_capacity_s3,3); current_cost_s3 = round(current_cost_s3,2)
                                
                                # 检查容量约束
                                if current_capacity_s3 >= project_capacity_mwh - EPSILON:
                                    current_blocks_config_s3 = sorted([(n1, block_type1), (n2, block_type2), (n3, block_type3)], key=lambda x: x[1]["block_description"])
                                    
                                    # 检查是否包含减簇配置，决定是否应用实际功率约束
                                    has_reduced_clusters_s3 = False
                                    for _, block_data in current_blocks_config_s3:
                                        for dc_detail in block_data.get("dc_containers_detail_list", []):
                                            dc_name = dc_detail["name"]
                                            dc_spec = get_dc_spec_by_name(dc_name)
                                            if dc_spec["reduced_clusters"] > 0:
                                                has_reduced_clusters_s3 = True
                                                break
                                        if has_reduced_clusters_s3:
                                            break
                                    
                                    if has_reduced_clusters_s3:
                                        # 有减簇配置时，检查实际功率输出约束
                                        actual_power_output_s3 = _calculate_actual_power_output(current_blocks_config_s3)
                                        if actual_power_output_s3 >= project_power_mw - EPSILON:
                                            _update_internal_best_solution(current_cost_s3, current_power_s3, current_capacity_s3, current_blocks_config_s3)
                                    else:
                                        # 无减簇配置时，只需检查额定功率约束
                                        if current_power_s3 >= project_power_mw - EPSILON:
                                            _update_internal_best_solution(current_cost_s3, current_power_s3, current_capacity_s3, current_blocks_config_s3)
    
    if abs(best_solution["cost"] - float('inf')) > EPSILON : 
        block_counts_condensed = {}; temp_block_list_for_condensing = []
        if best_solution["blocks_config"]: 
            if isinstance(best_solution["blocks_config"][0], tuple) and len(best_solution["blocks_config"][0]) == 2 :
                for count, block_data_item in best_solution["blocks_config"]:
                    for _ in range(count): temp_block_list_for_condensing.append(block_data_item)
        for block_data in temp_block_list_for_condensing: 
            desc = block_data["block_description"]
            if desc not in block_counts_condensed: block_counts_condensed[desc] = {"count": 0, "data": block_data} 
            block_counts_condensed[desc]["count"] += 1
        best_solution["block_details_for_message"] = []
        best_solution["block_details_for_display"] = []
        for desc in sorted(block_counts_condensed.keys()): 
            C_data = block_counts_condensed[desc]; total_count = C_data["count"]; block_sample = C_data["data"] 
            # V3.0: 改为显示等效容量而非等效成本
            message_detail_str = f"{total_count} x [{desc} | 单块交流功率:{block_sample['pcs_power_mw']:.3f}MW, 单块直流容量:{block_sample['block_dc_capacity_mwh']:.3f}MWh, 单块等效容量:{block_sample['block_equivalent_capacity_mwh']:.3f}MWh]"
            best_solution["block_details_for_message"].append(message_detail_str)
            
            # 构建 block_details_for_display
            current_dc_details_for_block_type = []
            for dc_detail in block_sample["dc_containers_detail_list"]:
                current_dc_details_for_block_type.append({
                    "name_cn": dc_detail["name_cn"],
                    "count_in_block": dc_detail["count"], 
                    "capacity_per_unit": dc_detail["capacity_per_unit"]
                })
            best_solution["block_details_for_display"].append({
                "block_description": desc,
                "count": total_count,
                "pcs_name_cn": block_sample.get("pcs_name_cn", block_sample["pcs_name"]),
                "pcs_power_mw": block_sample["pcs_power_mw"],
                "dc_containers": current_dc_details_for_block_type
            })
        if "total_dc_containers_calc" in best_solution: 
            del best_solution["total_dc_containers_calc"]
    return best_solution

def get_optimal_solution_for_dc_family(target_dc_family, project_power_mw, project_capacity_mwh, max_device_sets=100):
    # 计算最小设备套数
    min_device_sets = calculate_minimum_device_sets(project_power_mw, project_capacity_mwh)
    
    if abs(project_power_mw) < EPSILON and abs(project_capacity_mwh) < EPSILON:
         return {
            "cost": 0, "power": 0, "capacity": 0,
            "chosen_global_dc_specs": ["无"], "project_duration_hours": 0, "system_hour_type": 0,
            "message": "项目功率和容量均为0，无需配置。",
            "block_details_for_message": [], "block_details_for_display": [], "dc_family_technology": target_dc_family,
            "min_device_sets": min_device_sets
        }
    if project_power_mw < -EPSILON or project_capacity_mwh < -EPSILON:
        return {"message": f"基于 {target_dc_family} 直流技术: 项目功率和容量不能为负数。", "cost": float('inf'), "dc_family_technology": target_dc_family, "min_device_sets": min_device_sets}
    if abs(project_power_mw) < EPSILON and project_capacity_mwh > EPSILON:
        return {"message": f"基于 {target_dc_family} 直流技术: 项目功率为0时，容量也必须为0。", "cost": float('inf'), "dc_family_technology": target_dc_family, "min_device_sets": min_device_sets}
    if project_power_mw > EPSILON and project_capacity_mwh <= EPSILON:
        return {"message": f"基于 {target_dc_family} 直流技术: 项目容量必须为正 (当功率大于0时)。", "cost": float('inf'), "dc_family_technology": target_dc_family, "min_device_sets": min_device_sets}

    duration_hours, system_hour_type = calculate_project_duration_type(project_power_mw, project_capacity_mwh)
    
    # V3.0: 检查是否为1h或8h系统（不支持）
    if system_hour_type == 1 or system_hour_type == 8:
        return {
            "message": "暂不支持1或8小时系统",
            "cost": float('inf'),
            "power": 0,
            "capacity": 0,
            "project_duration_hours": duration_hours,
            "system_hour_type": system_hour_type,
            "dc_family_technology": target_dc_family,
            "min_device_sets": min_device_sets,
            "chosen_global_dc_specs": [],
            "block_details_for_message": [],
            "block_details_for_display": []
        }
    all_candidate_solutions = [] 
    accumulated_warnings_from_find_best = set()
    dc_specs_for_family = [name for name, spec in DC_CONTAINER_SPECS.items() if spec["family"] == target_dc_family]
    if not dc_specs_for_family: return {"cost": float('inf'), "message": f"基于 {target_dc_family} 直流技术: 未定义该类型的直流电池规格。", "project_duration_hours": duration_hours, "system_hour_type": system_hour_type, "power":0, "capacity":0, "chosen_global_dc_specs":[], "block_details_for_message":[], "user_limit_warning": "", "pcs_config_summary": {}, "total_dc_containers": float('inf')}
    global_dc_choices = []
    for dc_spec_name in dc_specs_for_family: global_dc_choices.append([dc_spec_name])
    for combo in combinations(dc_specs_for_family, 2): global_dc_choices.append(list(combo))
    if not global_dc_choices and dc_specs_for_family : global_dc_choices.append([dc_specs_for_family[0]])
    for current_global_dc_names in global_dc_choices:
        available_ess_blocks = generate_single_ess_block_configs(current_global_dc_names, system_hour_type, duration_hours, target_dc_family)
        if not available_ess_blocks: continue
        solution_from_find_best = find_best_combination_of_ess_blocks(project_power_mw, project_capacity_mwh, available_ess_blocks, system_hour_type, target_dc_family, max_device_sets)
        if abs(solution_from_find_best["cost"] - float('inf')) > EPSILON: 
            solution_from_find_best["pcs_config_summary"] = get_pcs_configuration_summary_map(solution_from_find_best.get("blocks_config"))
            solution_from_find_best["total_dc_containers"] = get_total_physical_dc_containers_count(solution_from_find_best.get("blocks_config")) 
            solution_from_find_best["chosen_global_dc_specs_raw"] = current_global_dc_names 
            solution_from_find_best["project_duration_hours"] = duration_hours
            solution_from_find_best["system_hour_type"] = system_hour_type
            all_candidate_solutions.append(solution_from_find_best)
        elif solution_from_find_best.get("user_limit_warning"): accumulated_warnings_from_find_best.add(solution_from_find_best["user_limit_warning"])
    
    overall_best_solution_for_family = {"cost": float('inf'), "message": f"基于 {target_dc_family} 直流技术: 未能找到合适的配置方案。", "project_duration_hours": duration_hours, "system_hour_type": system_hour_type, "power": 0, "capacity": 0, "blocks_config": None, "block_details_for_message": [], "block_details_for_display": [], "chosen_global_dc_specs": [], "user_limit_warning": "", "pcs_config_summary": {}, "total_dc_containers": float('inf'), "min_device_sets": min_device_sets}
    if not all_candidate_solutions:
        if accumulated_warnings_from_find_best: overall_best_solution_for_family["user_limit_warning"] = " ".join(list(accumulated_warnings_from_find_best)); overall_best_solution_for_family["message"] += f"\n注意: {overall_best_solution_for_family['user_limit_warning']}"
        overall_best_solution_for_family["dc_family_technology"] = target_dc_family
        return overall_best_solution_for_family
    else:
        abs_min_cost = min(s["cost"] for s in all_candidate_solutions)
        # V3.0: 成本相似阈值改为动态计算（万元）
        unit_price = get_unit_price(system_hour_type, target_dc_family)
        COST_SIMILARITY_THRESHOLD = 0.1 * 100 * unit_price if unit_price else 5.0  # 默认5万元
        cost_acceptable_solutions = [s for s in all_candidate_solutions if s["cost"] <= abs_min_cost + COST_SIMILARITY_THRESHOLD + EPSILON]
        if not cost_acceptable_solutions: 
            cost_acceptable_solutions = [s for s in all_candidate_solutions if abs(s["cost"] - abs_min_cost) < EPSILON]
            if not cost_acceptable_solutions and all_candidate_solutions: cost_acceptable_solutions = [min(all_candidate_solutions, key=lambda x:x["cost"])]
        if cost_acceptable_solutions: 
            cost_acceptable_solutions.sort(key=lambda s: (s.get("total_dc_containers", float('inf')), s["cost"], s["power"], 1 if s.get("user_limit_warning") else 0 ))
            best_of_the_best = cost_acceptable_solutions[0]
            overall_best_solution_for_family.update(best_of_the_best)
            overall_best_solution_for_family["chosen_global_dc_specs"] = [DC_CONTAINER_SPECS[name].get("name_cn", name) for name in best_of_the_best.get("chosen_global_dc_specs_raw", [])]
            overall_best_solution_for_family["project_duration_hours"] = duration_hours
            overall_best_solution_for_family["system_hour_type"] = system_hour_type
            overall_best_solution_for_family["dc_family_technology"] = target_dc_family
            overall_best_solution_for_family["min_device_sets"] = min_device_sets
            
            # V3.0: 添加单价和等效容量
            unit_price = get_unit_price(system_hour_type, target_dc_family)
            overall_best_solution_for_family["unit_price"] = unit_price
            # 计算等效容量：总成本 ÷ (100 × 单价)
            if unit_price and unit_price > 0:
                overall_best_solution_for_family["equivalent_capacity"] = round(overall_best_solution_for_family["cost"] / (100 * unit_price), 3)
            else:
                overall_best_solution_for_family["equivalent_capacity"] = 0
            # 将cost字段重命名为total_cost（但保留cost用于内部比较）
            overall_best_solution_for_family["total_cost"] = overall_best_solution_for_family["cost"]
            
            # 生成详细消息
            if abs(overall_best_solution_for_family["cost"] - float('inf')) > EPSILON:
                message_lines = []
                message_lines.append(f"项目功率: {project_power_mw:.3f} MW, 项目容量: {project_capacity_mwh:.3f} MWh")
                message_lines.append(f"计算的项目时长: {overall_best_solution_for_family['project_duration_hours']:.2f} 小时, 系统按 {overall_best_solution_for_family['system_hour_type']}h 类型配置.")
                
                final_warning = overall_best_solution_for_family.get("user_limit_warning")
                if final_warning:
                    message_lines.append(f"注意: {final_warning}")
                
                global_dc_spec_message_part1 = f"本方案基于储能系统家族 (采用 {target_dc_family} 储能系统)"
                global_dc_spec_message_part2 = "选用的具体全局DC电池规格为：" + ", ".join(overall_best_solution_for_family['chosen_global_dc_specs'])
                message_lines.append(f"{global_dc_spec_message_part1}；{global_dc_spec_message_part2}。")
                
                final_pcs_counts = get_pcs_configuration_summary_map(overall_best_solution_for_family.get("blocks_config"))
                final_total_dc_containers = get_total_physical_dc_containers_count(overall_best_solution_for_family.get("blocks_config"))
                
                pcs_summary_parts = []
                if final_pcs_counts.get("PCS_5MW", 0) > 0:
                    pcs_summary_parts.append(f'{final_pcs_counts["PCS_5MW"]}套{PCS_SPECS["PCS_5MW"]["name_cn"]}')
                if final_pcs_counts.get("PCS_7_5MW", 0) > 0:
                    pcs_summary_parts.append(f'{final_pcs_counts["PCS_7_5MW"]}套{PCS_SPECS["PCS_7_5MW"]["name_cn"]}')
                
                recommendation_intro = "推荐方案：未配置交流侧一体舱。"
                if pcs_summary_parts:
                    recommendation_intro = f"推荐方案：共需交流侧一体舱 { ' 和 '.join(pcs_summary_parts) } (总计 {sum(final_pcs_counts.values())} 套PCS)。"
                message_lines.append(recommendation_intro)
                
                dc_config_parts = []
                temp_dc_type_counts = {}
                if overall_best_solution_for_family.get("blocks_config"):
                    for num_blocks_of_type, block_data in overall_best_solution_for_family["blocks_config"]:
                        for _ in range(num_blocks_of_type):
                            for dc_detail in block_data["dc_containers_detail_list"]:
                                dc_name = dc_detail["name"]
                                temp_dc_type_counts[dc_name] = temp_dc_type_counts.get(dc_name, 0) + dc_detail["count"]
                
                for dc_name in sorted(temp_dc_type_counts.keys()):
                    count = temp_dc_type_counts[dc_name]
                    dc_spec = get_dc_spec_by_name(dc_name)
                    dc_config_parts.append(f'{count}套{dc_spec["name_cn"]} (单套容量 {dc_spec["capacity_mwh"]:.3f} MWh)')
                
                recommendation_dc_details = "未配置具体直流电池舱。" if not dc_config_parts and sum(final_pcs_counts.values()) > 0 else ""
                if dc_config_parts:
                    recommendation_dc_details = f"配置为：{ ' 和 '.join(dc_config_parts) } (总计 {final_total_dc_containers} 个电池舱)。"
                message_lines.append(recommendation_dc_details)
                
                # 计算实际功率输出
                actual_power_output = 0
                has_reduced_cluster_config = False
                if overall_best_solution_for_family.get("blocks_config"):
                    for num_blocks, block_data in overall_best_solution_for_family["blocks_config"]:
                        pcs_rated_power = block_data["pcs_power_mw"]
                        block_dc_capacity = block_data["block_dc_capacity_mwh"]
                        
                        # 检查是否包含减簇配置（用于显示信息）
                        for dc_detail in block_data.get("dc_containers_detail_list", []):
                            dc_name = dc_detail["name"]
                            dc_spec = get_dc_spec_by_name(dc_name)
                            if dc_spec["reduced_clusters"] > 0:
                                has_reduced_cluster_config = True
                                break
                        
                        # 统一公式：min(PCS额定功率, 直流容量÷系统时长)
                        if overall_best_solution_for_family['system_hour_type'] > EPSILON:
                            dc_limited_power = block_dc_capacity / overall_best_solution_for_family['system_hour_type']
                            actual_block_power = min(pcs_rated_power, dc_limited_power)
                        else:
                            actual_block_power = pcs_rated_power
                        
                        actual_power_output += num_blocks * actual_block_power
                
                actual_power_output = round(actual_power_output, 3)
                
                message_lines.append(f"最终配置的交流总功率 (额定): {overall_best_solution_for_family['power']:.3f} MW")
                if has_reduced_cluster_config:
                    message_lines.append(f"最终配置的交流总功率 (实际可输出): {actual_power_output:.3f} MW (考虑PCS和直流容量双重约束)")
                else:
                    message_lines.append(f"最终配置的交流总功率 (实际可输出): {actual_power_output:.3f} MW")
                message_lines.append(f"最终配置的直流总容量: {overall_best_solution_for_family['capacity']:.3f} MWh")
                # V3.0: 显示等效容量、单价和真实成本
                message_lines.append(f"总等效容量: {overall_best_solution_for_family.get('equivalent_capacity', 0):.3f} MWh")
                message_lines.append(f"应用单价: {overall_best_solution_for_family.get('unit_price', 0):.2f} 元/Wh ({overall_best_solution_for_family['system_hour_type']}h系统, {target_dc_family}家族)")
                message_lines.append(f"项目总成本: {overall_best_solution_for_family.get('total_cost', 0):.2f} 万元")
                message_lines.append(f"详细ESS单元块构成 (供参考):")
                message_lines.extend([f"  - {item}" for item in overall_best_solution_for_family.get("block_details_for_message", [])])
                
                overall_best_solution_for_family["message"] = "\n".join(message_lines)
            else:
                overall_best_solution_for_family["message"] = f"已找到基于 {target_dc_family} 直流技术的最优方案。"

    return overall_best_solution_for_family

def get_overall_optimal_solution(project_power_mw, project_capacity_mwh, max_device_sets=100):
    # 计算最小设备套数
    min_device_sets = calculate_minimum_device_sets(project_power_mw, project_capacity_mwh)
    
    solution_5mw = get_optimal_solution_for_dc_family("5MW", project_power_mw, project_capacity_mwh, max_device_sets)
    solution_7_5mw = get_optimal_solution_for_dc_family("7.5MW", project_power_mw, project_capacity_mwh, max_device_sets)

    cost_5mw = solution_5mw.get("cost", float('inf'))
    cost_7_5mw = solution_7_5mw.get("cost", float('inf'))

    if not isinstance(cost_5mw, (int, float)):
        cost_5mw = float('inf')
    if not isinstance(cost_7_5mw, (int, float)):
        cost_7_5mw = float('inf')

    chosen_solution = None
    if cost_5mw == float('inf') and cost_7_5mw == float('inf'):
        # V3.0: 检查是否是1h/8h系统被拒绝
        msg_5mw = solution_5mw.get("message", "")
        msg_7_5mw = solution_7_5mw.get("message", "")
        if "暂不支持1或8小时系统" in msg_5mw or "暂不支持1或8小时系统" in msg_7_5mw:
            final_message = "暂不支持1或8小时系统"
        else:
            final_message = "所有直流技术方案均未能找到合适的配置。请检查输入参数或系统配置规则。"
        
        return {
            "cost": float('inf'), "power": 0, "capacity": 0,
            "chosen_global_dc_specs": [], "project_duration_hours": calculate_project_duration_type(project_power_mw, project_capacity_mwh)[0],
            "system_hour_type": calculate_project_duration_type(project_power_mw, project_capacity_mwh)[1],
            "message": final_message,
            "block_details_for_message": [], "block_details_for_display": [], "dc_family_technology": "无",
            "min_device_sets": min_device_sets
        }
    elif cost_5mw <= cost_7_5mw:
        chosen_solution = solution_5mw
    else:
        chosen_solution = solution_7_5mw
    
    final_result = {
        "total_cost": chosen_solution.get("total_cost", chosen_solution.get("cost")),  # V3.0: 使用total_cost
        "equivalent_capacity": chosen_solution.get("equivalent_capacity", 0),  # V3.0: 新增
        "unit_price": chosen_solution.get("unit_price", 0),  # V3.0: 新增
        "power": chosen_solution.get("power"),
        "capacity": chosen_solution.get("capacity"),
        "chosen_global_dc_specs": chosen_solution.get("chosen_global_dc_specs", []),
        "project_duration_hours": chosen_solution.get("project_duration_hours"),
        "system_hour_type": chosen_solution.get("system_hour_type"),
        "message": chosen_solution.get("message", "方案处理完毕。"),
        "block_details_for_message": chosen_solution.get("block_details_for_message", []),
        "block_details_for_display": chosen_solution.get("block_details_for_display", []),
        "dc_family_technology": chosen_solution.get("dc_family_technology", "未知"),
        "min_device_sets": min_device_sets
    }
    return final_result

def calculate_minimum_device_sets(project_power_mw, project_capacity_mwh):
    """计算满足项目需求的最小设备套数"""
    if project_power_mw <= EPSILON or project_capacity_mwh <= EPSILON:
        return 0
    
    # 获取最大功率的单个设备块来计算最少需要的套数
    max_single_block_power = max(PCS_SPECS[pcs]["power_mw"] for pcs in PCS_SPECS)
    min_sets_for_power = math.ceil(project_power_mw / max_single_block_power)
    
    # 获取最大容量的单个设备块来计算最少需要的套数
    max_single_block_capacity = max(DC_CONTAINER_SPECS[dc]["capacity_mwh"] for dc in DC_CONTAINER_SPECS)
    duration_hours, system_hour_type = calculate_project_duration_type(project_power_mw, project_capacity_mwh)
    max_capacity_per_block = max_single_block_capacity * system_hour_type
    min_sets_for_capacity = math.ceil(project_capacity_mwh / max_capacity_per_block)
    
    return max(min_sets_for_power, min_sets_for_capacity, 1)

if __name__ == '__main__':
    test_power = 50
    test_capacity = 100
    overall_result = get_overall_optimal_solution(test_power, test_capacity)
    print(json.dumps(overall_result, ensure_ascii=False, indent=4))

    overall_result_no_solution = get_overall_optimal_solution(1, 1) 
    print(json.dumps(overall_result_no_solution, ensure_ascii=False, indent=4))

    overall_result_zero = get_overall_optimal_solution(0, 0)
    print(json.dumps(overall_result_zero, ensure_ascii=False, indent=4))

