cmake_minimum_required(VERSION 3.25)

find_package(cmake-bare REQUIRED PATHS node_modules/cmake-bare)

project(bare_inspect C)

add_bare_module(bare_inspect)

target_sources(
  ${bare_inspect}
  PRIVATE
    binding.c
)
